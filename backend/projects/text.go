package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

func GetTextHandler(w http.ResponseWriter, r *http.Request) {
	var name string
	r.ParseMultipartForm(0)
	name = r.FormValue("name")
	currentDir, err := os.Getwd()
	if err != nil {
		log.Println(err)
		return
	}
	if name == "" {

		folder, err := os.Open(currentDir + "\\" + Conf.PathText)
		if err != nil {
			fmt.Println("cant get folder: ", err.Error())
			return
		}
		defer folder.Close()
		fmt.Println("Working directory: " + currentDir + "\\" + Conf.PathText)
		// Получаем список файлов и папок
		files, err := folder.Readdir(-1)
		if err != nil {
			log.Println(err)
			return
		}
		names := make([]string, 0)
		for _, file := range files {
			if !file.IsDir() {
				names = append(names, file.Name())
			}
		}
		responceFiles(w, names)
		return
	}
	names := make([]string, 0)
	titleFile, err := os.ReadFile(currentDir + "\\" + Conf.PathText + "\\" + name)
	if err != nil {
		log.Println("cant open title.txt: ", err.Error())
		return
	}
	lines := strings.Split(string(titleFile), "\n")
	for _, line := range lines {
		names = append(names, line)
	}
	responceFiles(w, names)
}
