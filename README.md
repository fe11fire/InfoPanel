**Для чего это приложение?**

Вам нужно вывести простой контент (видео, изображение, текстовое сообщение, дни рождения) на экран (монитор, телевизор, проектор), используя в качестве плеера интернет-браузер.
На данный момент приложение разработано и опубликовано как интернет-сайт в локальной сети с возможностью обновления контента без перезапуска проигрывателя (обновления сайта в браузере) в операционной системе Windows.

![image_2024-12-05_14-33-04](https://github.com/user-attachments/assets/791dfd7c-f59e-41f8-a543-d34509d2edf0)

![image_2024-12-05_14-31-09](https://github.com/user-attachments/assets/7f14d79a-79c9-4a88-bf13-c99b5773b79f)

![image_2024-12-05_14-29-53](https://github.com/user-attachments/assets/ae38ed21-5314-4ba0-bd22-0cf7793d31b4)

**Схема работы:**

![image](https://github.com/user-attachments/assets/d73e8e8c-adfa-4356-a68f-053732a71d9f)

Настройки и информацию о контенте приложение получает от backend, используя POST и GET запросы. Для работы опубликованной версии приложения в каталоге **backend** находится приложение **backend.exe** - локальный веб-сервер, реализованный на Go и выполняющий функцию чтения файла **backend\config.json** и содержимого каталога **content**.
Возможно использования в качестве backend своего сервера, который будет обрабатывать POST, GET запросы приложения.

**Установка и запуск приложения:**
1. Скопируйте содержимое репозитория. Для примера "C:\infopanel".
2. Удалите ".example" для файла **backend\config.json.example** и каталога **content.example**.
3. Установите необходимые зависимости:
   при наличии npm, командой **npm install**;
            либо
   распаковав в текущий каталог архив **node_modules.rar**.
4. Запустите локальный веб-сервер **backend\backend.exe**.
5. В браузере (для разработки и тестирования использовался Google Chrome) откройте локально сайт **index.html**.

**Обновление контента и настроек:**

Для работы приложения обязательным условием является наличие backend. В случае отсутствия ответов на запросы, включается режим screensaver (часы).
Изменение настроек производится путем обновления файла **backend\config.json**. После его сохранения приложение через заданный интервал (_config_update_interval_) обновит значения параметров согласно внесенным изменениям.
Аналогично изменение контента производится добавлением, удалением или изменением файлов в каталоге **content** (каталог расположения контента возможно изменить в **backend\config.json**). Приложение обновляет информацию о контенте после завершения отображения блока информации.

**Настройки ярлыка браузера для автозапуска (полный экран, разрешение на проигрывание видео):**

"C:\Program Files\Google\Chrome\Application\chrome.exe" --start-fullscreen --autoplay-policy=no-user-gesture-required

**Отключение сообщения о прекращении поддержки браузера в Windows 7:**

Open Start, type regedit.exe and select the Registry editor result.
.Go to HKEY_CURRENT_USER\Software\Policies\Google\Chrome.
If one of the keys does not exist, right-click on the previous and select New > Key. Name it accordingly.
Right-click on Chrome and select New > Dword (32-bit) Value.
Name it SuppressUnsupportedOSWarning.
Double-click on the name and set its value to 1.
Restart the computer.
