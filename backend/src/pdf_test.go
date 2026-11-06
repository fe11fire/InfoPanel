package main

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"
)

func TestPDFReadOnlyAPI(t *testing.T) {
	dir := t.TempDir()
	pdf := "%PDF-1.4\nfixture"
	name := "Объявление.PDF"
	for file, data := range map[string]string{
		"config.json": `{"path_pdf":"."}`,
		name:          pdf,
		"notes.txt":   "ignored",
	} {
		if err := os.WriteFile(filepath.Join(dir, file), []byte(data), 0644); err != nil {
			t.Fatal(err)
		}
	}
	b := backend{dir: dir}
	list := httptest.NewRecorder()
	b.ServeHTTP(list, httptest.NewRequest(http.MethodPost, "/pdf", nil))
	if list.Code != http.StatusOK || list.Body.String() != "{\"result\":[\"Объявление.PDF\"]}\n" {
		t.Fatalf("unexpected list: %d %s", list.Code, list.Body.String())
	}
	for _, tc := range []struct {
		method, name string
		want         int
	}{
		{http.MethodGet, name, http.StatusOK},
		{http.MethodPost, name, http.StatusMethodNotAllowed},
		{http.MethodGet, "missing.pdf", http.StatusNotFound},
		{http.MethodGet, "../secret.pdf", http.StatusBadRequest},
		{http.MethodGet, "notes.txt", http.StatusBadRequest},
	} {
		response := httptest.NewRecorder()
		b.ServeHTTP(response, httptest.NewRequest(tc.method, "/pdf?name="+url.QueryEscape(tc.name), nil))
		if response.Code != tc.want {
			t.Fatalf("%s %s: got %d, want %d", tc.method, tc.name, response.Code, tc.want)
		}
		if tc.want == http.StatusOK && (response.Body.String() != pdf ||
			response.Header().Get("Content-Type") != "application/pdf" ||
			response.Header().Get("Access-Control-Allow-Origin") != "*") {
			t.Fatalf("unexpected PDF response: %v %s", response.Header(), response.Body.String())
		}
	}
	entries, err := os.ReadDir(dir)
	if err != nil || len(entries) != 3 {
		t.Fatalf("PDF requests changed the content directory: %v %v", entries, err)
	}
}
