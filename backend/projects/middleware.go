package main

import (
	"fmt"
	"net/http"
	"runtime"
)

func panicRecovery(h func(w http.ResponseWriter, r *http.Request)) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				buf := make([]byte, 2048)
				n := runtime.Stack(buf, false)
				buf = buf[:n]

				fmt.Printf("recovering from err %v\n %s", err, buf)
				w.Write([]byte(`{"error":"our server got panic"}`))
			}
		}()

		h(w, r)
	}
}
