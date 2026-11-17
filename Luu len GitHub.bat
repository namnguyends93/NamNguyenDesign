@echo off
rem Noi thu muc nay voi GitHub (lan dau) roi luu va day len GitHub.
cd /d "%~dp0"
where git >nul 2>nul || (echo [LOI] Chua cai git. & pause & exit /b 1)
if not exist ".git" (
  echo == Lan dau: noi thu muc voi GitHub ==
  git init -b main || goto err
  git remote add origin https://github.com/namnguyends93/NamNguyenDesign.git || goto err
)
echo == Lay lich su tu GitHub ==
git fetch origin || goto err
git rev-parse --verify -q HEAD >nul || (git reset -q origin/main || goto err)
for /f "delims=" %%a in ('git config user.name') do set GN=%%a
if not defined GN git config user.name "Nam Nguyen"
for /f "delims=" %%a in ('git config user.email') do set GE=%%a
if not defined GE git config user.email "namnguyends93@users.noreply.github.com"
echo == Luu thay doi ==
git add -A || goto err
git diff --cached --quiet && (echo Khong co gi moi de luu.) || (git commit -q -m "Update portfolio %date% %time:~0,5%" || goto err)
echo == Day len GitHub (neu hien cua so dang nhap GitHub, hay dang nhap) ==
git push -u origin main || goto err
echo.
echo ===== XONG: da luu len GitHub =====
pause
exit /b 0
:err
echo.
echo ===== [LOI] xem thong bao phia tren =====
pause
exit /b 1
