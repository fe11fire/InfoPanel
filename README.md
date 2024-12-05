# Что делать
1. Распаковать файлы. Для примера: *"C:\infopanel\"*.
2. Изменить путь к видеофайлам (работает пока только с таким контентом) в файле конфигурации *"C:\infopanel\content\router\config.json"*:
   "file_path": "C:/infopanel/content/video/"
   либо другой каталог, в котором лежат видеофайлы.
3. Перед запуском *index.html* в браузере (разрабатывалось в Chrome), запустить *"C:\infopanel\content\router\projects.exe"*




**Настройки ярлыка браузера для автозапуска (полный экран, разрешение на проигрывание видео)**
"C:\Program Files\Google\Chrome\Application\chrome.exe" --start-fullscreen --autoplay-policy=no-user-gesture-required

**Отключение сообщения о прекращении поддержки браузера в Windows 7**
Open Start, type regedit.exe and select the Registry editor result.
.Go to HKEY_CURRENT_USER\Software\Policies\Google\Chrome.
If one of the keys does not exist, right-click on the previous and select New > Key. Name it accordingly.
Right-click on Chrome and select New > Dword (32-bit) Value.
Name it SuppressUnsupportedOSWarning.
Double-click on the name and set its value to 1.
Restart the computer.