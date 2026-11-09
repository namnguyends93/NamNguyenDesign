@echo off
chcp 65001 >nul
title Nam Nguyen Design - Admin
cd /d "%~dp0"
if not exist node_modules (
  echo Lan dau: dang cai dat, doi mot chut...
  call npm.cmd install
)
echo.
echo  Admin:  http://127.0.0.1:3000/admin
echo  Chinh sua truc tiep:  http://127.0.0.1:3000/edit
echo  Giu cua so nay mo trong luc chinh sua. Dong cua so = tat admin.
echo.
start "" /min cmd /c "timeout /t 2 /nobreak >nul && explorer http://127.0.0.1:3000/admin"
node server.js
pause
