# DarkPulsr — GitHub Pages deploy script
# Run once:  gh auth login
# Then run:  .\deploy.ps1

$ErrorActionPreference = "Stop"
$RepoName = "darkpulsr"

Set-Location $PSScriptRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git not found. Install from https://git-scm.com" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI not found. Install: winget install GitHub.cli" -ForegroundColor Red
    exit 1
}

$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub login required. Running: gh auth login" -ForegroundColor Yellow
    gh auth login -h github.com -p https -w
}

if (-not (Test-Path ".git")) {
    git init
    git branch -M main
}

git add index.html .nojekyll
$status = git status --porcelain
if ($status) {
    git commit -m "Update DarkPulsr dashboard"
}

$remotes = git remote 2>$null
if ($remotes -notcontains "origin") {
    Write-Host "Creating public repo: $RepoName" -ForegroundColor Cyan
    gh repo create $RepoName --public --source=. --remote=origin --push
} else {
    git push -u origin main
}

Write-Host "Enabling GitHub Pages..." -ForegroundColor Cyan
gh api repos/{owner}/$RepoName/pages -X POST -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/" 2>$null
if ($LASTEXITCODE -ne 0) {
    gh api repos/{owner}/$RepoName/pages -X PUT -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/" 2>$null
}

$username = gh api user -q .login
$siteUrl = "https://$username.github.io/$RepoName/"

Write-Host ""
Write-Host "Deploy complete!" -ForegroundColor Green
Write-Host "Live site: $siteUrl" -ForegroundColor Yellow
Write-Host "Repo:      https://github.com/$username/$RepoName" -ForegroundColor Yellow
