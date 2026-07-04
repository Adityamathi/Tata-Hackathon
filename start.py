import subprocess, sys, time, webbrowser, os

# Kill existing processes on :3000 and :8000
for port in [3000, 8000]:
    subprocess.run(f"for /f \"tokens=5\" %a in ('netstat -ano | find \":{port}\" ^| find \"LISTENING\"') do taskkill /f /pid %a >nul 2>&1",
                   shell=True, capture_output=True)

print("Starting API backend on :8000...")
api = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend_server:app", "--host", "0.0.0.0", "--port", "8000"],
                       creationflags=subprocess.CREATE_NEW_CONSOLE)

time.sleep(2)

print("Starting Next.js UI on :3000...")
os.chdir("prism-ui")
ui = subprocess.Popen(["npx", "next", "start", "-p", "3000"],
                      creationflags=subprocess.CREATE_NEW_CONSOLE)
os.chdir("..")

print("\nOpen:  http://localhost:3000")
print("Demo:  http://localhost:3000/demo")
print("Close the opened windows to stop.\n")

try:
    api.wait()
except KeyboardInterrupt:
    api.kill()
    ui.kill()
