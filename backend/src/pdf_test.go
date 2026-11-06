package main

import (
	"bytes"
	"fmt"
	"image/png"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestPDFPagesCache(t *testing.T) {
	dir := t.TempDir()
	name := "Объявление.PDF"
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, twoPagePDF(), 0644); err != nil {
		t.Fatal(err)
	}
	renderer := &pdfRenderer{}
	waitForPages := func() []string {
		t.Helper()
		deadline := time.Now().Add(45 * time.Second)
		for time.Now().Before(deadline) {
			reply := renderer.pages(dir, name)
			if reply.Error != "" {
				t.Fatal(reply.Error)
			}
			if !reply.Pending {
				return reply.Result
			}
			time.Sleep(20 * time.Millisecond)
		}
		t.Fatal("timed out waiting for PDF conversion")
		return nil
	}
	pages := waitForPages()
	if len(pages) != 2 {
		t.Fatalf("expected two pages, got %v", pages)
	}
	for i, page := range pages {
		if filepath.Base(page) != pageName(i+1) {
			t.Fatalf("unexpected page order: %v", pages)
		}
		file, err := os.Open(filepath.Join(dir, filepath.FromSlash(page)))
		if err != nil {
			t.Fatal(err)
		}
		img, err := png.DecodeConfig(file)
		file.Close()
		if err != nil || img.Width == 0 || img.Height == 0 {
			t.Fatalf("invalid rendered PNG %s: %v", page, err)
		}
	}
	if reply := renderer.pages(dir, name); reply.Pending || len(reply.Result) != 2 || reply.Result[0] != pages[0] {
		t.Fatalf("expected cached pages, got %+v", reply)
	}
	if reply := renderer.pages(dir, "../secret.pdf"); reply.Error == "" {
		t.Fatal("expected traversal to be rejected")
	}

	// A new version of the source must use a different cache directory.
	if err := os.WriteFile(path, append(twoPagePDF(), '\n'), 0644); err != nil {
		t.Fatal(err)
	}
	updated := waitForPages()
	if len(updated) != 2 || updated[0] == pages[0] {
		t.Fatalf("expected a fresh cache version, got %v", updated)
	}
	if renderer.pool != nil {
		t.Cleanup(func() { renderer.pool.Close() })
	}
}

func twoPagePDF() []byte {
	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Count 2 /Kids [3 0 R 4 0 R] >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 120 180] /Resources << >> >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 180 120] /Resources << >> >>",
	}
	var pdf bytes.Buffer
	pdf.WriteString("%PDF-1.4\n")
	offsets := make([]int, 0, len(objects))
	for i, object := range objects {
		offsets = append(offsets, pdf.Len())
		fmt.Fprintf(&pdf, "%d 0 obj\n%s\nendobj\n", i+1, object)
	}
	xref := pdf.Len()
	fmt.Fprintf(&pdf, "xref\n0 %d\n0000000000 65535 f \n", len(objects)+1)
	for _, offset := range offsets {
		fmt.Fprintf(&pdf, "%010d 00000 n \n", offset)
	}
	fmt.Fprintf(&pdf, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(objects)+1, xref)
	return pdf.Bytes()
}
