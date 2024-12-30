package main

import (
	"log"
	"net/http"
	"strconv"
)

var Conf Config

func main() {
	startApp()
}

func startApp() {
	http.Handle("/video", corsHandler(http.HandlerFunc(panicRecovery(GetFilenamesHandler))))
	http.Handle("/birthday", corsHandler(http.HandlerFunc(panicRecovery(GetBirthdayHandler))))
	http.Handle("/birthdays", corsHandler(http.HandlerFunc(panicRecovery(GetBirthdaysHandler))))
	http.Handle("/present", corsHandler(http.HandlerFunc(panicRecovery(GetPresentHandler))))
	http.Handle("/config", corsHandler(http.HandlerFunc(panicRecovery(GetConfigHandler))))
	http.Handle("/imgs", corsHandler(http.HandlerFunc(panicRecovery(GetImageHandler))))
	http.Handle("/text", corsHandler(http.HandlerFunc(panicRecovery(GetTextHandler))))
	_, err := getConfig()
	initDatabase()
	if err != nil {
		log.Println("error when load config: ", err)
	}
	portString := strconv.Itoa(Conf.ServerPort)
	log.Println("Http server is start with ip: " + Conf.ServerIp + " and port: " + portString)
	err2 := http.ListenAndServe(":"+portString, nil)
	if err2 != nil {
		//	log.Println("error when SERVER start: ", err2)
	}
}

func corsHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Origin, Accept, token, x-request-id, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		h.ServeHTTP(w, r)
	})
}
