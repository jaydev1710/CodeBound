# CodeBound

CodeBound is a small, local-first AI coding agent built as a portfolio and learning project. It shows the core shape of a coding agent—chat UI, API, local language model, controlled tools, context management, diffs, and approvals—without hiding the system behind cloud services or large frameworks.

> **Status:** Local chat, persistent conversation history, workspace selection/explorer, read/search tools, proposed file changes with approval, and a bounded agent loop are implemented.

## Architecture

```text
User
  ↓
React + Vite + Tailwind UI
  ↓  REST
FastAPI API
  ↓
CodeBound agent ──→ compact conversation context
  ↓
llama.cpp (localhost only)
  ↓
Qwen2.5-Coder-0.5B-Instruct GGUF

Agent → validated tools → selected workspace → approval-gated changes
```

## Why local AI and this model?

The default model is `Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF`, file `qwen2.5-coder-0.5b-instruct-q4_0.gguf`. It is a small coding/instruction model distributed publicly on Hugging Face under Apache 2.0. The Q4_0 GGUF is roughly 429 MB and is a practical starting point for a CPU-only Windows computer with 4 GB RAM. llama.cpp runs the downloaded GGUF directly; normal use requires neither a Hugging Face token nor a hosted inference API.

This deliberately trades capability and speed for low memory use. CodeBound later compensates with narrowly scoped tools, compact context, previews, and user approvals.

## Stack

- React, Vite, Tailwind CSS (JavaScript/JSX)
- Python, FastAPI, REST
- llama.cpp local server
- Hugging Face GGUF model download

## Setup

### 1. Start the local model

The project includes the Windows CPU llama.cpp runtime under `runtime/llama.cpp/`. Put `qwen2.5-coder-0.5b-instruct-q4_0.gguf` in `models/`. If you do not already have it, run `scripts/download-model.ps1` in PowerShell. If the model is already present, skip the download.

Start it from the project root with the checked-in launcher. It always uses the runtime and model stored inside this project:

```powershell
.\scripts\start-model.ps1
```

### 2. Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend

In a second terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open the address Vite prints (usually `http://localhost:5173`).

## Features

- Persistent conversation history in browser local storage.
- **New conversation** creates a separate saved thread.
- **Clear chat** resets only the current conversation.
- Workspace selection and a safe file explorer. The backend remembers the selected folder for the current server process; the browser remembers its path and re-selects it after restart.
- Agent tools: `list_files`, `read_file`, `search_files`, `write_file`, `delete_file`.
- Writes and deletes create approval-gated unified diffs and are never applied automatically.
- Bounded multi-step agent loop so the small local model cannot run indefinitely.
- `/api/health` reports local model and workspace status.

## Example prompts

- `Explain when I should use a custom React hook.`
- `Show a small FastAPI endpoint that validates a request body.`
- `Help me plan a login form component.`

## Safety and limitations

Every filesystem operation resolves and validates paths inside the selected workspace. Absolute paths and `..` traversal outside the root are rejected. Writes and deletes require a clear diff and explicit approval. There is no unrestricted shell/terminal tool.

The 0.5B model is intentionally modest; it is suitable for short coding assistance and simple file tasks, not complex autonomous refactors. Responses are not streamed yet, and conversation history is stored locally in the browser rather than in a cloud account.
