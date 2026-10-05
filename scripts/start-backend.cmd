@echo off
setlocal
cd /d "%~dp0.."
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  py -3.12 -m venv .venv || exit /b 1
)
call ".venv\Scripts\activate.bat"
python -m pip install -r requirements.txt || exit /b 1
python -m uvicorn backend.main:app --reload --port 8000
