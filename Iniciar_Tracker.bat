@echo off
title WCS Operations Control Center
color 0b
cls

echo ==========================================================
echo    __  ___ ___   ____ ______ ___ ___   _     ____ _   __ ____ 
echo   /  ^|/  // _ \ / __//_  __// _// _ \ / \   /  _// \ / // _  \
echo  / /^|_/ // // /_\ \   / /  / _// , _// /__ _/ /  / \ / // ___/
echo /_/  /_//_/ \_//___/  /_/  /___//_/ \_\\____//___//_/ \_//_/    
echo ==========================================================
echo  Integrated Logistics Tracking ^& Follow-up Middleware
echo ==========================================================
echo.

:: 1. Verify Node.js and NPM installations
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Node.js could not be detected on your computer.
    echo.
    echo Please download and install Node.js, which includes npm, from:
    echo https://nodejs.org/
    echo.
    echo After installing, restart this script.
    echo ==========================================================
    pause
    exit /b
)

:: 2. Navigate to webapp directory
echo [SYSTEM] Locating webapp directory...
cd /d "%~dp0webapp"
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Could not navigate to the "webapp" folder.
    echo Make sure this script is placed in: C:\Users\gbued\Documents\4_Tracker\
    echo ==========================================================
    pause
    exit /b
)

:: 3. Verify node_modules
if not exist node_modules (
    echo [SYSTEM] "node_modules" not found. Installing dependencies...
    echo [SYSTEM] Running: npm install - This may take a minute
    call npm install
)

:: 4. Open web browser tabs in advance
echo [SYSTEM] Launching tracking panels in your default browser...
start http://localhost:3000
start http://localhost:3000/portal

:: 5. Execute Dev server directly in this window
echo [SYSTEM] Starting Next.js Dev Engine...
echo ==========================================================
echo.
call npm run dev

if %errorlevel% neq 0 (
    color 0c
    echo.
    echo [ERROR] Next.js dev server crashed or failed to start.
    echo Check the error messages above for details.
    echo ==========================================================
    pause
)
