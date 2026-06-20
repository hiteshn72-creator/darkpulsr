@echo off
title DarkPulsr API Deploy (Vercel)
cd /d "%~dp0"

where node >nul 2>&1 || (echo Node.js not found. & pause & exit /b 1)

echo.
echo Deploying Yahoo proxy API to Vercel...
echo Project name: darkpulsr-api
echo.

call npx vercel deploy --prod --yes --name darkpulsr-api
if errorlevel 1 (
  echo.
  echo If first time: run  npx vercel login
  echo Then retry this script.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   API DEPLOY COMPLETE
echo   Set in index.html (GitHub Pages):
echo   DARKPULSR_API_BASE = your Vercel URL
echo ========================================
echo.
pause
