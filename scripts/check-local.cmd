@echo off
setlocal
cd /d "%~dp0.."
echo === CodeBound local checks ===
echo Project: %CD%
echo.
echo [Model]
if exist "models\qwen2.5-coder-0.5b-instruct-q4_0.gguf" (echo FOUND: models\qwen2.5-coder-0.5b-instruct-q4_0.gguf) else (echo MISSING: Qwen GGUF model)
echo.
echo [llama.cpp]
if exist "runtime\llama.cpp\llama-server.exe" (echo FOUND: llama-server.exe) else (echo MISSING: llama-server.exe)
echo.
echo [Backend]
curl -s http://127.0.0.1:8000/api/health
echo.
echo [Model server]
curl -s http://127.0.0.1:8080/health
echo.
endlocal
