# PRISM — Start both servers with one command
Write-Host "=== PRISM: Starting servers ===" -ForegroundColor Cyan

# Kill existing servers
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start API backend (port 8000)
$api = Start-Process -WindowStyle Normal -FilePath "python" -ArgumentList "-m", "uvicorn", "backend_server:app", "--host", "0.0.0.0", "--port", "8000" -PassThru -NoNewWindow
Write-Host "✓ API backend starting on :8000" -ForegroundColor Green

# Start Next.js frontend (port 3000) from prism-ui directory
$ui = Start-Process -WindowStyle Normal -FilePath "npx" -ArgumentList "next", "start", "-p", "3000" -WorkingDirectory (Join-Path $PSScriptRoot "prism-ui") -PassThru -NoNewWindow
Write-Host "✓ Next.js UI starting on :3000" -ForegroundColor Green

Write-Host ""
Write-Host "=== Open these URLs ===" -ForegroundColor Cyan
Write-Host "  Demo:    http://localhost:3000/demo" -ForegroundColor White
Write-Host "  Landing: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop." -ForegroundColor Yellow
