@echo off
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$p = Get-Process Code -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1;" ^
  "if($p){ $ws.AppActivate($p.MainWindowTitle) }"