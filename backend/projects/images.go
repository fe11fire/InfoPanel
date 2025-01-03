package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func GetImageHandler(w http.ResponseWriter, _ *http.Request) {
	currentDir, err := os.Getwd()
	if err != nil {
		fmt.Println("cant get current dir: ", err.Error())
		return
	}
	folder, err := os.Open(currentDir + "\\" + Conf.PathImages)
	if err != nil {
		fmt.Println("cant get folder: ", err.Error())
		return
	}
	defer folder.Close()
	fmt.Println("Working directory: " + currentDir + "\\" + Conf.PathImages)
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
}
