@echo off
del /q J:\q\q63x\w\bellsack\codex\out\* 2>nul
echo should create txt or bmp file in J:\q\q63x\w\bellsack\codex\out\ if browser is set up to auto save downloads there, as it generates a download.

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window "J:\q\q63x\w\bellsack\codex\Bellsack0575gptFreeEdit.html"

timeout /t 5 /nobreak >nul
call FocusVSCode.bat