package main

import (
	"log"
	"net/http"
	"os"
)

func GetConfigHandler(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	f, err := os.ReadFile("config.json")
	if err != nil {
		log.Printf("Cant find file config.json %s", err)
	}
	w.Write(f)
}
