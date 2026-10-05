$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$server = Join-Path $projectRoot 'runtime\llama.cpp\llama-server.exe'
$model = Join-Path $projectRoot 'models\qwen2.5-coder-0.5b-instruct-q4_0.gguf'

if (-not (Test-Path -LiteralPath $server)) {
    throw "llama.cpp was not found at $server"
}
if (-not (Test-Path -LiteralPath $model)) {
    throw "The configured Qwen GGUF model was not found at $model"
}

# CPU-only and a 1,024-token context to fit the stated 4 GB RAM constraint.
& $server --model $model --ctx-size 1024 --host 127.0.0.1 --port 8080
