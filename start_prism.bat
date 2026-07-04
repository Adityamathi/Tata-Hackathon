@echo off
title PRISM Launcher
echo === PRISM: Starting servers ===

echo Killing existing processes on :3000 and :8000...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| find ":8000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting API backend on :8000...
start "PRISM-API" cmd /k "python -m uvicorn backend_server:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

echo Starting Next.js UI on :3000...
start "PRISM-UI" cmd /k "cd prism-ui && npx next start -p 3000"

echo.
echo === Open these URLs ===
echo   Demo:    http://localhost:3000/demo
echo   Landing: http://localhost:3000
echo.
echo Close the cmd windows to stop.
pause
