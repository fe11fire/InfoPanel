package main

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

func GetHolidayHandler(w http.ResponseWriter, r *http.Request) {
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
	holidayFile, err := os.ReadFile(currentDir + "\\" + Conf.PathHoliday + "\\" + Conf.FileHoliday)
	if err != nil {
		fmt.Println("cant open holiday.txt: ", err.Error())
		return
	}
	fios := make([]string, 0, 10)
	holidayLines := strings.Split(string(holidayFile), "\n")
	//	fmt.Println(birthdayLines)
	if len(holidayLines) == 0 {
		fmt.Println("file holiday.txt is empty ")
		return
	}

	for i := 0; i < len(holidayLines); i++ {
		holidayLine := strings.Split(holidayLines[i], ":")
		dateStr := strconv.Itoa(day2) + "." + strconv.Itoa(month)
		//+birthdayLine[1]+birthdayLine[2]
		if holidayLine[0] == dateStr {
			fio := holidayLine[1]
			fioThithoutslash := strings.Split(fio, "\r")
			//fio:=strings.Join(birthdayLine," ")
			fios = append(fios, fioThithoutslash[0])
		}
	}
	responceFiles(w, fios)
}
