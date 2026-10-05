$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$modelsDir = Join-Path $projectRoot 'models'
$model = Join-Path $modelsDir 'qwen2.5-coder-0.5b-instruct-q4_0.gguf'
$url = 'https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_0.gguf?download=true'

New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null
if (Test-Path -LiteralPath $model) {
    Write-Host "Model already exists: $model"
    exit 0
}

Write-Host 'Downloading Qwen2.5-Coder 0.5B Q4_0 (~429 MB)...'
Invoke-WebRequest -Uri $url -OutFile $model
Write-Host "Saved model to $model"
