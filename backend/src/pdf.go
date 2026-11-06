package main

import (
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"image"
	"image/png"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	pdfium "github.com/klippa-app/go-pdfium"
	"github.com/klippa-app/go-pdfium/requests"
	"github.com/klippa-app/go-pdfium/webassembly"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
	"github.com/tetratelabs/wazero/experimental"
)

const (
	pdfCacheDir = ".infopanel-pdf-cache"
	maxPDFSize  = 100 << 20
	maxPDFPages = 300
)

type pdfResponse struct {
	Result  []string `json:"result"`
	Pending bool     `json:"pending,omitempty"`
	Error   string   `json:"error,omitempty"`
}

type pdfFailure struct {
	message string
	retryAt time.Time
}

type pdfRenderer struct {
	mu       sync.Mutex
	busy     bool
	failures map[string]pdfFailure
	pool     pdfium.Pool
}

func isPDF(name string) bool {
	return strings.EqualFold(filepath.Ext(name), ".pdf")
}

func pdfList(root fs.FS) []string {
	files := []string{}
	for _, name := range listFiles(root, ".", false, "") {
		if isPDF(name) {
			files = append(files, name)
		}
	}
	return files
}

func (p *pdfRenderer) pages(dir, name string) pdfResponse {
	reply := pdfResponse{Result: []string{}}
	if !entryName(name) || !isPDF(name) {
		reply.Error = "Ожидалось имя PDF-файла"
		return reply
	}
	root, err := os.OpenRoot(dir)
	if err != nil {
		reply.Error = "Не удалось открыть папку PDF: " + err.Error()
		return reply
	}
	defer root.Close()
	info, err := root.Stat(name)
	if err != nil {
		reply.Error = "Не удалось открыть PDF: " + err.Error()
		return reply
	}
	if !info.Mode().IsRegular() || info.Size() > maxPDFSize {
		reply.Error = "Ожидался обычный PDF-файл размером до 100 МиБ"
		return reply
	}

	version := fmt.Sprintf("%x", sha256.Sum256([]byte(fmt.Sprintf("v1\x00%s\x00%d\x00%d", name, info.Size(), info.ModTime().UnixNano()))))
	cache := pdfCacheDir + "/" + version
	if entries, err := fs.ReadDir(root.FS(), cache); err == nil && len(entries) > 0 {
		for index, entry := range entries {
			if entry.Name() != pageName(index+1) || !entry.Type().IsRegular() {
				reply.Error = "Кэш PDF повреждён. Очистите папку " + pdfCacheDir
				reply.Result = []string{}
				return reply
			}
			reply.Result = append(reply.Result, cache+"/"+entry.Name())
		}
		return reply
	}

	p.mu.Lock()
	defer p.mu.Unlock()
	now := time.Now()
	for key, failure := range p.failures {
		if !now.Before(failure.retryAt) {
			delete(p.failures, key)
		}
	}
	key := filepath.Join(dir, version)
	if failure, ok := p.failures[key]; ok {
		reply.Error = failure.message
		return reply
	}
	if !p.busy {
		p.busy = true
		go p.prepare(dir, name, info, cache, key)
	}
	reply.Pending = true
	return reply
}

func (p *pdfRenderer) prepare(dir, name string, info fs.FileInfo, cache, key string) {
	err := p.convert(dir, name, info, cache)
	p.mu.Lock()
	defer p.mu.Unlock()
	p.busy = false
	if err != nil {
		log.Printf("prepare PDF %q: %v", name, err)
		if p.failures == nil {
			p.failures = make(map[string]pdfFailure)
		}
		p.failures[key] = pdfFailure{err.Error(), time.Now().Add(time.Minute)}
	}
}

func (p *pdfRenderer) convert(dir, name string, info fs.FileInfo, cache string) error {
	root, err := os.OpenRoot(dir)
	if err != nil {
		return err
	}
	defer root.Close()
	file, err := root.Open(name)
	if err != nil {
		return err
	}
	defer file.Close()
	current, err := file.Stat()
	if err != nil {
		return err
	}
	if !os.SameFile(info, current) || info.Size() != current.Size() || !info.ModTime().Equal(current.ModTime()) {
		return fmt.Errorf("PDF изменился во время подготовки страниц")
	}

	if p.pool == nil {
		p.pool, err = webassembly.Init(webassembly.Config{
			MaxTotal: 1, MaxIdle: 1,
			FSConfig: wazero.NewFSConfig(),
			RuntimeConfig: wazero.NewRuntimeConfig().
				WithCoreFeatures(api.CoreFeaturesV2 | experimental.CoreFeaturesExceptionHandling).
				WithMemoryLimitPages(4096),
		})
		if err != nil {
			return fmt.Errorf("не удалось запустить PDFium: %w", err)
		}
	}
	instance, err := p.pool.GetInstance(5 * time.Second)
	if err != nil {
		return err
	}
	defer instance.Close()
	document, err := instance.OpenDocument(&requests.OpenDocument{FileReader: file, FileReaderSize: info.Size()})
	if err != nil {
		return fmt.Errorf("не удалось прочитать PDF, проверьте файл и защиту паролем: %w", err)
	}
	defer instance.FPDF_CloseDocument(&requests.FPDF_CloseDocument{Document: document.Document})
	count, err := instance.FPDF_GetPageCount(&requests.FPDF_GetPageCount{Document: document.Document})
	if err != nil {
		return err
	}
	if count.PageCount < 1 || count.PageCount > maxPDFPages {
		return fmt.Errorf("ожидалось от 1 до %d страниц, получено %d", maxPDFPages, count.PageCount)
	}

	if err := root.MkdirAll(pdfCacheDir, 0755); err != nil {
		return err
	}
	stage := pdfCacheDir + "/.render-" + rand.Text()
	if err := root.Mkdir(stage, 0755); err != nil {
		return err
	}
	defer root.RemoveAll(stage)
	for index := 0; index < count.PageCount; index++ {
		page, err := instance.RenderPageInPixels(&requests.RenderPageInPixels{
			Page:  requests.Page{ByIndex: &requests.PageByIndex{Document: document.Document, Index: index}},
			Width: 1920, Height: 1920,
		})
		if err != nil {
			return fmt.Errorf("страница %d: %w", index+1, err)
		}
		err = writePDFPage(root, stage+"/"+pageName(index+1), page.Result.RenderedImage)
		page.Cleanup()
		if err != nil {
			return fmt.Errorf("запись страницы %d в кэш: %w", index+1, err)
		}
	}
	current, err = root.Stat(name)
	if err != nil {
		return err
	}
	if !os.SameFile(info, current) || info.Size() != current.Size() || !info.ModTime().Equal(current.ModTime()) {
		return fmt.Errorf("PDF изменился во время подготовки страниц")
	}
	// Клиенты получают путь только после публикации полного набора страниц.
	return root.Rename(stage, cache)
}

func pageName(number int) string {
	return fmt.Sprintf("page-%04d.png", number)
}

func writePDFPage(root *os.Root, path string, img image.Image) error {
	file, err := root.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		return err
	}
	err = png.Encode(file, img)
	closeErr := file.Close()
	if err != nil {
		return err
	}
	return closeErr
}
