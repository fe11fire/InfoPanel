package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

// TODO
func GetPresentHandler(w http.ResponseWriter, r *http.Request) {
	var path string
	var title string
	r.ParseMultipartForm(0)
	path = r.FormValue("path")
	title = r.FormValue("title")
	if path == "" {
		currentDir, err := os.Getwd()
		folder, err := os.Open(currentDir + "\\" + Conf.PathPresent)
		defer folder.Close()
		fmt.Println("Working directory: " + currentDir + "\\" + Conf.PathPresent)
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
		// Выводим имена файлов и папок
		if title == "true" {
			for _, file := range files {
				if file.Name() == "title.txt" {
					titleFile, err := os.ReadFile(currentDir + "\\" + Conf.PathPresent + "\\" + "title.txt")
					if err != nil {
						log.Println("cant open title.txt: ", err.Error())
						return
					}
					lines := strings.Split(string(titleFile), "\n")
					//rangeLines := lines[:len(lines)-1]
					for _, line := range lines {
						line2 := strings.Split(line, "\r")
						names = append(names, line2[0])
					}
				}
			}
			responceFiles(w, names)
			return
		}
		//if title == "false" {
		for _, file := range files {
			if file.IsDir() == true {
				if file.Name() == "title.txt" {
				} else {
					names = append(names, file.Name())
				}
			}
		}
		//	}
		responceFiles(w, names)
		return
	} else {
		currentDir, err := os.Getwd()
		folder, err := os.Open(currentDir + "\\" + Conf.PathPresent + "\\" + path)
		defer folder.Close()
		fmt.Println("Working directory: " + currentDir + "\\" + Conf.PathPresent + "\\" + path)
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
		// Выводим имена файлов и папок
		if title == "true" {
			for _, file := range files {
				if file.Name() == "title.txt" {
					path := currentDir + "\\" + Conf.PathPresent + "\\" + path + "\\" + "title.txt"
					titleFile, err := os.ReadFile(path)
					if err != nil {
						log.Println("cant open title.txt: ", err.Error())
						return
					}
					lines := strings.Split(string(titleFile), "\n")
					//rangeLines := lines[:len(lines)-1]
					for _, line := range lines {
						line2 := strings.Split(line, "\r")
						names = append(names, line2[0])
					}
				}
			}
			responceFiles(w, names)
			return
		}
		//	if title == "false" {
		for _, file := range files {
			//кроме title.txt
			if file.IsDir() == false {
				if file.Name() == "title.txt" {
				} else {
					names = append(names, file.Name())
				}
			}
		}
		//	}
		responceFiles(w, names)
		return
	}

}
