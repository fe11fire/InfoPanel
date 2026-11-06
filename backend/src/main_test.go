package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestContentAPI(t *testing.T) {
	dir := t.TempDir()
	write := func(name, contents string) {
		t.Helper()
		path := filepath.Join(dir, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(contents), 0644); err != nil {
			t.Fatal(err)
		}
	}
	write("config.json", `{"path_images":"media","path_video":"media","path_text":"media","path_present":"media","path_birthday":"media","path_holiday":"media","custom":"preserved"}`)
	write("media/notice.txt", "\ufeffОбъявление\r\n\r\nВторая строка")
	write("media/birthday.txt", "05.11.1990:Иван")
	write("media/holiday.txt", "5.11:Праздник")
	write("media/Новости/title.txt", "Новости")
	write("media/Новости/2.jpg", "")
	b := backend{dir: dir}

	for _, tc := range []struct {
		route string
		form  url.Values
		want  string
	}{
		{"/video", nil, `{"result":["birthday.txt","holiday.txt","notice.txt"]}`},
		{"/imgs", nil, `{"result":["birthday.txt","holiday.txt","notice.txt"]}`},
		{"/img", nil, `{"result":["birthday.txt","holiday.txt","notice.txt"]}`},
		{"/text", nil, `{"result":["birthday.txt","holiday.txt","notice.txt"]}`},
		{"/text", url.Values{"name": {"notice.txt"}}, `{"result":["Объявление","Вторая строка"]}`},
		{"/text", url.Values{"name": {"../config.json"}}, `{"result":[]}`},
		{"/present", nil, `{"result":["Новости"]}`},
		{"/present", url.Values{"path": {"Новости"}}, `{"result":["2.jpg"]}`},
		{"/present", url.Values{"path": {"Новости"}, "title": {"true"}}, `{"result":["Новости"]}`},
		{"/birthdays", nil, `{"result":[{"date":"05.11.1990","fio":"Иван"}]}`},
		{"/birthday?day=5&month=11", nil, `{"result":["Иван"]}`},
		{"/holiday", url.Values{"day": {"5"}, "month": {"11"}}, `{"result":["Праздник"]}`},
	} {
		req := httptest.NewRequest(http.MethodPost, tc.route, strings.NewReader(tc.form.Encode()))
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		resp := httptest.NewRecorder()
		b.ServeHTTP(resp, req)
		var got, want any
		if resp.Code != http.StatusOK || json.Unmarshal(resp.Body.Bytes(), &got) != nil ||
			json.Unmarshal([]byte(tc.want), &want) != nil || !reflect.DeepEqual(got, want) {
			t.Errorf("%s %v: got %d %s, want %s", tc.route, tc.form, resp.Code, resp.Body.String(), tc.want)
		}
	}

	for _, value := range []string{"preserved", "updated"} {
		write("config.json", `{"custom":"`+value+`"}`)
		resp := httptest.NewRecorder()
		b.ServeHTTP(resp, httptest.NewRequest(http.MethodGet, "/config", nil))
		if resp.Code != http.StatusOK || strings.TrimSpace(resp.Body.String()) != `{"custom":"`+value+`"}` {
			t.Fatalf("config: got %d %s", resp.Code, resp.Body.String())
		}
	}

	resp := httptest.NewRecorder()
	b.ServeHTTP(resp, httptest.NewRequest(http.MethodOptions, "/config", nil))
	if resp.Code != http.StatusNoContent || resp.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("preflight: got %d %v", resp.Code, resp.Header())
	}
}
