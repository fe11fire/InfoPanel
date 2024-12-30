package main

import (
	"encoding/json"
	"log"
	"os"
)

type Config struct {
	ServerIp     string `json:"server_ip"`
	ServerPort   int    `json:"server_port"`
	FilePath     string `json:"path_video"`
	PathPresent  string `json:"path_present"`
	PathBirthday string `json:"path_birthday"`
	PathImages   string `json:"path_images"`
	FileBirthday string `json:"file_birthday"`
	PathText     string `json:"path_text"`
}

func getConfig() (Config, error) {
	config, err := os.ReadFile("config.json")
	if err != nil {
		log.Println("error when opening file: ", err)
		return Config{}, err
	}

	err = json.Unmarshal(config, &Conf)
	if err != nil {
		log.Println("error when unmarshal JSON: ", err)
		return Config{}, err
	}
	return Conf, err
}
