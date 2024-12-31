package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

func GetFilenamesHandler(w http.ResponseWriter, r *http.Request) {
	currentDir, err := os.Getwd()
	files, err := os.ReadDir(currentDir + "\\" + Conf.FilePath)
	fmt.Println("Working directory: " + currentDir + "\\" + Conf.FilePath)
	if err != nil {
		log.Println(err)
		return
	}
	if len(files) == 0 {
		responceZeroFiles(w)
		return
	}
	filenames2 := make([]string, 0)
	for _, f := range files {
		if f.IsDir() == false {
			fullName := f.Name()
			filenames2 = append(filenames2, fullName)
		}
	}
	responceFiles(w, filenames2)
}

func responceFiles(w http.ResponseWriter, filenames2 []string) {
	w.WriteHeader(http.StatusOK)
	resp := make(map[string][]string)
	resp["result"] = filenames2
	jsonResp2, err := json.Marshal(resp)
	if err != nil {
		log.Printf("Error while marshal JSON %s", err)
	}
	w.Write(jsonResp2)
}

func responceZeroFiles(w http.ResponseWriter) {
	w.WriteHeader(http.StatusInternalServerError)
	w.Header().Set("Content-Type", "application/json")
	//w.Header().Set("Access-Control-Allow-Origin", "*")
	//w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Origin, Accept, token")
	//w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	resp := make(map[string]string)
	resp["error"] = "no files in folder"
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		log.Printf("Error while marshal JSON %s", err)
	}
	w.Write(jsonResp)
}
