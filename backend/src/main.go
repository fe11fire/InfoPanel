package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type backend struct {
	dir string
}

type settings struct {
	ServerIP     string `json:"server_ip"`
	ServerPort   int    `json:"server_port"`
	Video        string `json:"path_video"`
	Images       string `json:"path_images"`
	Text         string `json:"path_text"`
	PDF          string `json:"path_pdf"`
	Present      string `json:"path_present"`
	Birthday     string `json:"path_birthday"`
	BirthdayFile string `json:"file_birthday"`
	Holiday      string `json:"path_holiday"`
	HolidayFile  string `json:"file_holiday"`
}

func (b backend) readConfig() (settings, json.RawMessage, error) {
	cfg := settings{ServerIP: "127.0.0.1", ServerPort: 8084, PDF: "../content/pdf", BirthdayFile: "birthday.txt", HolidayFile: "holiday.txt"}
	data, err := os.ReadFile(filepath.Join(b.dir, "config.json"))
	if err != nil {
		return cfg, nil, err
	}
	data = []byte(strings.TrimSpace(strings.TrimPrefix(string(data), "\ufeff")))
	if len(data) == 0 || data[0] != '{' {
		return cfg, nil, errors.New("config.json must contain a JSON object")
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return cfg, nil, err
	}
	return cfg, data, nil
}

func (b backend) contentPath(path string) string {
	path = filepath.FromSlash(strings.ReplaceAll(path, "\\", "/"))
	if filepath.IsAbs(path) {
		return path
	}
	return filepath.Join(b.dir, path)
}

// API file and folder names come directly from directory listings.
func entryName(name string) bool {
	return name != "" && name != "." && name != ".." && !strings.ContainsAny(name, "/\\:\x00")
}

func withContent[T any](b backend, dir string, read func(fs.FS) []T) []T {
	if dir == "" {
		return []T{}
	}
	root, err := os.OpenRoot(b.contentPath(dir))
	if err != nil {
		if !errors.Is(err, fs.ErrNotExist) {
			log.Printf("open content directory %q: %v", dir, err)
		}
		return []T{}
	}
	defer root.Close()
	return read(root.FS())
}

func listFiles(root fs.FS, dir string, directories bool, exclude string) []string {
	result := []string{}
	entries, err := fs.ReadDir(root, dir)
	if err != nil {
		if !errors.Is(err, fs.ErrNotExist) {
			log.Printf("read directory %q: %v", dir, err)
		}
		return result
	}
	for _, entry := range entries {
		matchesType := entry.Type().IsRegular()
		if directories {
			matchesType = entry.IsDir()
		}
		if matchesType && !strings.EqualFold(entry.Name(), exclude) {
			result = append(result, entry.Name())
		}
	}
	return result
}

func readLines(root fs.FS, name string) []string {
	result := []string{}
	data, err := fs.ReadFile(root, name)
	if err != nil {
		if !errors.Is(err, fs.ErrNotExist) {
			log.Printf("read content file %q: %v", name, err)
		}
		return result
	}
	for _, line := range strings.Split(strings.TrimPrefix(string(data), "\ufeff"), "\n") {
		line = strings.TrimSuffix(line, "\r")
		if strings.TrimSpace(line) != "" {
			result = append(result, line)
		}
	}
	return result
}

type datedEntry struct {
	Date string `json:"date"`
	Name string `json:"fio"`
}

func readDates(root fs.FS, name string) []datedEntry {
	result := []datedEntry{}
	if !entryName(name) {
		return result
	}
	for _, line := range readLines(root, name) {
		date, value, ok := strings.Cut(line, ":")
		if ok {
			result = append(result, datedEntry{strings.TrimSpace(date), strings.TrimSpace(value)})
		}
	}
	return result
}

func namesOnDay(entries []datedEntry, day, month string) []string {
	result := []string{}
	d, dayErr := strconv.Atoi(day)
	m, monthErr := strconv.Atoi(month)
	if dayErr != nil || monthErr != nil || d < 1 || d > 31 || m < 1 || m > 12 {
		return result
	}
	for _, entry := range entries {
		parts := strings.Split(entry.Date, ".")
		if len(parts) < 2 || len(parts) > 3 {
			continue
		}
		entryDay, dayErr := strconv.Atoi(parts[0])
		entryMonth, monthErr := strconv.Atoi(parts[1])
		if dayErr == nil && monthErr == nil && entryDay == d && entryMonth == m {
			result = append(result, entry.Name)
		}
	}
	return result
}

func (b backend) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Cache-Control", "no-store")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost && r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET, POST, OPTIONS")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := r.ParseForm(); err != nil {
		http.Error(w, "invalid request parameters", http.StatusBadRequest)
		return
	}

	cfg, raw, err := b.readConfig()
	if err != nil {
		log.Printf("read config.json: %v", err)
		http.Error(w, "cannot read backend/config.json", http.StatusInternalServerError)
		return
	}
	arg := r.Form.Get
	list := func(dir string) []string {
		return withContent(b, dir, func(root fs.FS) []string { return listFiles(root, ".", false, "") })
	}
	var result any
	switch strings.TrimSuffix(r.URL.Path, "/") {
	case "/config":
		writeJSON(w, raw)
		return
	case "/pdf":
		if name := arg("name"); name != "" {
			servePDF(w, r, b.contentPath(cfg.PDF), name)
			return
		}
		result = withContent(b, cfg.PDF, pdfList)
	case "/video":
		result = list(cfg.Video)
	case "/img", "/imgs":
		result = list(cfg.Images)
	case "/text":
		result = withContent(b, cfg.Text, func(root fs.FS) []string {
			name := arg("name")
			if name == "" {
				return listFiles(root, ".", false, "")
			}
			if !entryName(name) {
				return []string{}
			}
			return readLines(root, name)
		})
	case "/present":
		result = withContent(b, cfg.Present, func(root fs.FS) []string {
			folder := arg("path")
			if folder == "" {
				return listFiles(root, ".", true, "")
			}
			if !entryName(folder) {
				return []string{}
			}
			if arg("title") == "true" {
				return readLines(root, folder+"/title.txt")
			}
			return listFiles(root, folder, false, "title.txt")
		})
	case "/birthdays", "/birthday", "/holiday":
		route := strings.TrimSuffix(r.URL.Path, "/")
		dir, name := cfg.Birthday, cfg.BirthdayFile
		if route == "/holiday" {
			dir, name = cfg.Holiday, cfg.HolidayFile
		}
		entries := withContent(b, dir, func(root fs.FS) []datedEntry { return readDates(root, name) })
		result = entries
		if route != "/birthdays" {
			result = namesOnDay(entries, arg("day"), arg("month"))
		}
	default:
		http.NotFound(w, r)
		return
	}
	writeJSON(w, map[string]any{"result": result})
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write response: %v", err)
	}
}

func main() {
	executable, err := os.Executable()
	if err != nil {
		log.Fatal(err)
	}
	b := backend{dir: filepath.Dir(executable)}
	cfg, _, err := b.readConfig()
	if err != nil {
		log.Fatalf("read %s: %v", filepath.Join(b.dir, "config.json"), err)
	}
	if cfg.ServerIP == "" || cfg.ServerPort < 1 || cfg.ServerPort > 65535 {
		log.Fatal("check server_ip and server_port in backend/config.json")
	}
	server := http.Server{
		Addr:              net.JoinHostPort(cfg.ServerIP, strconv.Itoa(cfg.ServerPort)),
		Handler:           b,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       time.Minute,
	}
	listener, err := net.Listen("tcp", server.Addr)
	if err != nil {
		log.Fatalf("listen on %s: %v", server.Addr, err)
	}
	fmt.Printf("InfoPanel backend listening on http://%s\n", server.Addr)
	log.Fatal(server.Serve(listener))
}
