# Для чего это приложение?
Вам нужно вывести простой контент (видео, изображение, текстовое сообщение, дни рождения) на экран (монитор, телевизор, проектор), используя в качестве плеера интернет-браузер.
На данный момент приложение разработано и опубликовано как интернет-сайт в локальной сети с возможностью обновления контента без перезапуска проигрывателя (обновления сайта в браузере) в операционной системе Windows.


![image_2024-12-05_14-33-04](https://github.com/user-attachments/assets/e441bb41-f3c8-4c42-b6af-74069663e0ea)
![image_2024-12-05_14-31-09](https://github.com/user-attachments/assets/cb2e8fc7-5234-4fe0-bf22-14badfaa015e)
![image_2024-12-05_14-29-53](https://github.com/user-attachments/assets/5819695c-a8ed-4b71-a592-fc19d619c99a)

# Схема работы

![image](https://github.com/user-attachments/assets/d73e8e8c-adfa-4356-a68f-053732a71d9f)

Настройки и информацию о контенте приложение получает от **backend**, используя POST и GET запросы. Для работы опубликованной версии приложения в каталоге `backend` находится приложение `backend.exe` - локальный веб-сервер, реализованный на Go и выполняющий функцию чтения файла `backend\config.json` и содержимого каталога `content`.
Возможно использования в качестве **backend** своего сервера, который будет обрабатывать POST, GET запросы приложения.

# Установка и запуск приложения

1. **Скопируйте содержимое репозитория**  
   Например, в каталог `C:\infopanel`.

2. **Удалите `.example` из следующих файлов и каталогов**  
   - Файл: `backend\config.json.example` → `backend\config.json`  
   - Каталог: `content.example` → `content`

3. **Установите необходимые зависимости**  
   - Если у вас установлен `npm`, выполните команду:  
     ```bash
     npm install
     ```
   - Либо распакуйте содержимое архива `node_modules.rar` в текущий каталог.

4. **Запустите локальный веб-сервер**  
   Выполните `backend\backend.exe`.

5. **Откройте локальный сайт в браузере**  
   Для разработки и тестирования использовался Google Chrome. Запустите файл `index.html`.

# Обновление контента и настроек

Для работы приложения обязательным условием является наличие **backend**. В случае отсутствия ответов на запросы, включается режим screensaver (часы).

Изменение настроек производится путем обновления файла `backend\config.json`. После его сохранения приложение через заданный интервал _config_update_interval_ обновит значения параметров согласно внесенным изменениям.

Аналогично изменение контента производится добавлением, удалением или изменением файлов в каталоге `content`. Каталоги расположения контента возможно изменить в `backend\config.json` _path_video_, _path_present_, _path_birthday_, _path_text_, _path_images_. Приложение обновляет информацию о контенте после завершения отображения блока информации.

# Взаимодействие с backend

Для первичной инициализации сервера данных используются свойства `server_ip`, `server_port` объекта `backend` в `assets\js\config\default.js`, из которых составляется `backend_url`.

Алгоритм взаимодействия подразумевает получение данных в json-формате. В случае отсутствия ответа либо некорректного формата входных данных применяется пустое значение, то есть отсутствие информации для соответствующего запроса.

Спецификация POST-запросов:

- `backend_url\video` - получение имен файлов каталога `path_video` (имена каталогов игнорируются). 

   Пример response:

   ```
   {"result":["video1.mp4","video2.mp4"]}
   ```
- `backend_url\img` - получение имен файлов каталога `path_img` (имена каталогов игнорируются). 

   Пример response:

   ```
   {"result":["picture1.jpg","picture2.jpg"]}
   ```
- `backend_url\text` - получение имен файлов каталога `path_text` (имена каталогов игнорируются). 

   Пример response:

   ```
   {"result":["message1.txt","message2.txt"]}
   ```
  - `backend_url\text?name=fileName` - получение содержимого текстового файла `fileName` из каталога `path_text` построчно. 

      Пример response:
   
      ```
      {"result":["line1","line2"]}
      ```
- `backend_url\present` - получение имен каталогов из каталога `path_present` (имена файлов игнорируются). 

   Пример response:

   ```
   {"result":["present1","present2"]}
   ```
  - `backend_url\present?path=pathName` - получение имен файлов каталога `path_present\pathName` кроме `title.txt`. 

      Пример response:
   
      ```
      {"result":["picture1","picture2"]}
      ```
  - `backend_url\present?path=pathName&title=true` - получение содержимого текстового файла `path_present\pathName\title.txt` построчно. 

      Пример response:
   
      ```
      {"result":["title line 1","title line 2"]}
      ```
- `backend_url\birthdays` - получение содержимого текстового файла `path_birthday\file_birthday` построчно. 

   Пример response:

   ```
   {"result":["﻿12.10:Ronald Montgomery","12.10:Jane Cooper","21.11:Stacy Adams"]}
   ```
- `backend_url\birthday?day=dayNumber&month=monthNumber` - получение имен только из тех строк, которые соответствуют маске `dayNumber.monthNumber` текстового файла `path_birthday\file_birthday`. 

   Пример response:

   ```
   {"result":["Ronald Montgomery","Jane Cooper"]}
   ```
- `backend_url\holiday?day=dayNumber&month=monthNumber` - получение имен только из тех строк, которые соответствуют маске `dayNumber.monthNumber` текстового файла `path_holiday\file_holiday`. 

   Пример response:

   ```
   {"result":["New Year"]}
   ```
- `backend_url\config` - получение содержимого текстового файла `backend\config.json` построчно. 

   Пример response:

   ```
   {
    "server_ip": "127.0.0.1",
    "server_port": 8084,
   }
   ```

# Настройка браузера в Windows для работы с приложением в качестве информационной панели

**Автозапуск приложения**

Добавить в автозагрузку Windows файлы:
   - `backend\backend.exe`;
   - ярлык браузера с настроенным по-умолчанию отображением файла `index.html`.

**Настройки ярлыка браузера для автозапуска (полный экран, разрешение на проигрывание видео)**

"C:\Program Files\Google\Chrome\Application\chrome.exe" --start-fullscreen --autoplay-policy=no-user-gesture-required

**Отключение сообщения о прекращении поддержки браузера в Windows 7**

Open Start, type regedit.exe and select the Registry editor result.
Go to HKEY_CURRENT_USER\Software\Policies\Google\Chrome.
If one of the keys does not exist, right-click on the previous and select New > Key. Name it accordingly.
Right-click on Chrome and select New > Dword (32-bit) Value.
Name it `SuppressUnsupportedOSWarning`.
Double-click on the name and set its value to 1.
Restart the computer.
