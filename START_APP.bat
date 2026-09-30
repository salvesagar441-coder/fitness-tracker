@echo off
title FitPulse - Fitness Tracker Server
echo.
echo  ========================================
echo    FitPulse - Fitness Tracker
echo    Starting Server...
echo  ========================================
echo.

:: Open browser after 2 seconds
start "" cmd /c "timeout /t 2 >nul && start http://localhost:5000"

:: Start Flask server
cd /d "%~dp0"
python app.py

pause
