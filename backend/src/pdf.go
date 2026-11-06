package main

import (
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const maxPDFSize = 100 << 20

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

func servePDF(w http.ResponseWriter, r *http.Request, dir, name string) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		http.Error(w, "use GET to download PDF files", http.StatusMethodNotAllowed)
		return
	}
	if !entryName(name) || !isPDF(name) {
		http.Error(w, "invalid PDF file name", http.StatusBadRequest)
		return
	}
	root, err := os.OpenRoot(dir)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer root.Close()
	info, err := root.Lstat(name)
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}
	file, err := root.Open(name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()
	info, err = file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}
	if info.Size() > maxPDFSize {
		http.Error(w, "PDF exceeds 100 MiB", http.StatusRequestEntityTooLarge)
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, name, info.ModTime(), file)
}
