@echo off
title DarkPulsr API Deploy (Render Blueprint)
cd /d "%~dp0"

echo.
echo ========================================
echo   DarkPulsr Yahoo API - Render Deploy
echo ========================================
echo.
echo Step 1: Browser mein Render Blueprint khulega
echo Step 2: GitHub repo connect karo (darkpulsr)
echo Step 3: "Apply" dabao - service auto ban jayegi
echo.
echo API URL: https://darkpulsr-api.onrender.com
echo GitHub Pages is URL ko automatically use karega.
echo.

start "" "https://dashboard.render.com/bp/new?repo=https://github.com/hiteshn72-creator/darkpulsr"

echo Browser open ho gaya. Render par Apply ke baad 2-3 min wait karo.
echo.
echo Test: https://darkpulsr-api.onrender.com/api/health
echo.
pause
