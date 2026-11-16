@echo off
chcp 65001 >nul
title Nam Nguyen Design - Admin
cd /d "%~dp0"
if not exist node_modules (
  echo Lan dau: dang cai dat, doi mot chut...
  call npm.cmd install
)
echo.
echo  Chinh sua truc tiep:  http://127.0.0.1:3000/edit
echo  Admin (xuat ban, sao luu):  http://127.0.0.1:3000/admin
echo  Web that:  https://namnguyendesign.namnguyen-thietketkm.workers.dev/
echo  Giu cua so nay mo trong luc chinh sua. Dong cua so = tat admin.
echo.
rem Opens the visual editor in Chrome (falls back to the default browser if Chrome is not found)
start "" /min cmd /c "timeout /t 2 /nobreak >nul && (start "" chrome "http://127.0.0.1:3000/edit" || explorer "http://127.0.0.1:3000/edit")"
node server.js
pause
