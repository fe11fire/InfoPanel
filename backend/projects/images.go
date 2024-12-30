package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func GetImageHandler(w http.ResponseWriter, _ *http.Request) {
	currentDir, err := os.Getwd()
	folder, err := os.Open(currentDir + "\\" + Conf.PathImages)
	defer folder.Close()
	fmt.Println("Working directory: " + currentDir + "\\" + Conf.PathImages)
	if err != nil {
		log.Println(err)
		return
	}
	// Получаем список файлов и папок
	files, err := folder.Readdir(-1)
	if err != nil {
		log.Println(err)
		return
	}
	names := make([]string, 0)
	for _, file := range files {
		if file.IsDir() == false {
			names = append(names, file.Name())
		}
	}
	responceFiles(w, names)
	return
}
