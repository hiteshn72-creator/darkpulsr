@echo off
title DarkPulsr Server
cd /d "%~dp0"

where node >nul 2>&1 || (echo Node.js not found. Install from https://nodejs.org/ & pause & exit /b 1)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (echo npm install failed. & pause & exit /b 1)
)

echo.
echo Starting DarkPulsr at http://localhost:3000
echo Yahoo proxy: /api/yahoo-chart  /api/yahoo-search
echo.
node server.js
