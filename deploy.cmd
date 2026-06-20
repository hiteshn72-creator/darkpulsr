@echo off
title DarkPulsr Deploy
cd /d "%~dp0"

where git >nul 2>&1 || (echo Git not found. & pause & exit /b 1)
where gh >nul 2>&1 || (echo GitHub CLI not found. & pause & exit /b 1)

echo Checking GitHub login...
gh auth status >nul 2>&1
if errorlevel 1 (
    echo Please login first: gh auth login -h github.com -p https -w
    pause
    exit /b 1
)

echo.
echo Deploying DarkPulsr to GitHub Pages...
echo.

git add index.html .nojekyll deploy.cmd FINISH-DEPLOY.bat js\tradingview-advanced.js 2>nul
git diff --cached --quiet
if errorlevel 1 (
    set GIT_AUTHOR_NAME=Astro_Hiteshh
    set GIT_AUTHOR_EMAIL=hiteshn72-creator@users.noreply.github.com
    set GIT_COMMITTER_NAME=Astro_Hiteshh
    set GIT_COMMITTER_EMAIL=hiteshn72-creator@users.noreply.github.com
    git commit -m "Prepare DarkPulsr for GitHub Pages deploy"
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo Creating public repo: darkpulsr
    gh repo create darkpulsr --public --source=. --remote=origin --push --description "DarkPulsr - Advanced Astro-Financial Analytics"
) else (
    git push -u origin main
)

echo.
echo Enabling GitHub Pages...
gh api repos/hiteshn72-creator/darkpulsr/pages -X POST -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/" 2>nul
if errorlevel 1 (
    gh api repos/hiteshn72-creator/darkpulsr/pages -X PUT -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/" 2>nul
)

echo.
echo ========================================
echo   DEPLOY COMPLETE!
echo   Live site: https://hiteshn72-creator.github.io/darkpulsr/
echo   Repo:      https://github.com/hiteshn72-creator/darkpulsr
echo ========================================
echo.
pause
