package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type BodyJSON struct {
	Month string `json:"month"`
	Day   string `json:"day"`
}

func GetBirthdayHandler(w http.ResponseWriter, r *http.Request) {
	var datab BodyJSON
	r.ParseMultipartForm(0)
	datab.Month = r.FormValue("month")
	datab.Day = r.FormValue("day")
	var day2 int
	var month int
	var err error
	if datab.Month == "" {
		now := time.Now()
		day2 = now.Day()
		month = int(now.Month())
		fmt.Println("day: ", day2)
		fmt.Println("month: ", month)
	} else {
		day2, err = strconv.Atoi(datab.Day)
		if err != nil {
			fmt.Println(w, "cant convert day to int: ", err.Error())
			return
		}

		month, err = strconv.Atoi(datab.Month)
		if err != nil {
			fmt.Println(w, "cant convert month to int: ", err.Error())
			return
		}
	}
	currentDir, err := os.Getwd()
	birthdayFile, err := os.ReadFile(currentDir + "\\" + Conf.PathBirthday + "\\" + "birthday.txt")
	if err != nil {
		fmt.Println("cant open birthday.txt: ", err.Error())
		return
	}
	fios := make([]string, 0, 10)
	birthdayLines := strings.Split(string(birthdayFile), "\n")
	//	fmt.Println(birthdayLines)
	if len(birthdayLines) == 0 {
		fmt.Println("file birthday.txt is empty ")
		return
	}

	for i := 0; i < len(birthdayLines); i++ {
		birthdayLine := strings.Split(birthdayLines[i], ":")
		dateStr := strconv.Itoa(day2) + "." + strconv.Itoa(month)
		//+birthdayLine[1]+birthdayLine[2]
		if birthdayLine[0] == dateStr {
			fio := birthdayLine[1]
			fioThithoutslash := strings.Split(fio, "\r")
			//fio:=strings.Join(birthdayLine," ")
			fios = append(fios, fioThithoutslash[0])
		}
	}
	responceFiles(w, fios)
}

type Element struct {
	Date string `json:"date"`
	FIO  string `json:"fio"`
}

func GetBirthdaysHandler(w http.ResponseWriter, r *http.Request) {
	currentDir, err := os.Getwd()
	birthdayFile, err := os.ReadFile(currentDir + "\\" + Conf.PathBirthday + "\\" + Conf.FileBirthday)
	if err != nil {
		fmt.Println("cant open birthday.txt: ", err.Error())
		return
	}
	fmt.Println(currentDir + "\\" + Conf.PathBirthday + Conf.FileBirthday)
	var dataSlice = make([]Element, 0)
	lines := strings.Split(string(birthdayFile), "\n")
	//rangeLines := lines[:len(lines)-1]
	for _, line := range lines {
		keyVal := strings.Split(line, ":")
		fio := keyVal[1]
		fioThithoutslash := strings.Split(fio, "\r")
		dataSlice = append(dataSlice, Element{Date: keyVal[0], FIO: fioThithoutslash[0]})
	}

	w.WriteHeader(http.StatusOK)
	resp := make(map[string][]Element)

	resp["result"] = dataSlice
	jsonResp2, err := json.Marshal(resp)
	if err != nil {
		fmt.Printf("Error while marshal JSON %s", err)
	}
	w.Write(jsonResp2)
}
