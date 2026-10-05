# CodeBound

**CodeBound** is a local-first AI coding agent that combines cloud-based LLM reasoning with local workspace tools.

It is designed to help developers inspect and work with an existing codebase through a simple chat interface while keeping file access and workspace operations on the local machine.

> **Current status:** Early prototype / active development

## ✨ Features

* 🤖 **AI-powered code assistance** through OpenRouter
* ☁️ **Cloud LLM reasoning** without requiring a local AI model
* 📁 **Local workspace selection** using a project folder path
* 🔎 **Workspace file browsing**
* 📄 **File inspection** through the local backend
* 💬 **Conversation history**
* 📝 **Proposed file changes** shown for review
* 🔐 **Approval-gated file changes**
* 🖥️ **Responsive React interface**
* 🧩 **Python/FastAPI backend**
* 🔑 **API key stored locally in `.env`**
* 🛡️ Local workspace operations remain under the control of the CodeBound backend

## 🧠 Why OpenRouter?

The current version uses **OpenRouter** as the model provider instead of running a large language model locally.

This is useful for the current development environment because the application does not require a dedicated GPU or a large local model.

The default configuration uses:

```text
Provider: OpenRouter
Model: openrouter/free
```

The model can be changed through the environment configuration without changing the main frontend application.

> Free model availability and routing on OpenRouter can change over time.

## 🏗️ How It Works

CodeBound separates AI reasoning from local workspace operations.

```text
┌─────────────────────┐
│     React + UI      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    FastAPI Backend  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  CodeBound Agent    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     OpenRouter      │
│    LLM Reasoning    │
└──────────┬──────────┘
           │
           │ tool requests
           ▼
┌─────────────────────┐
│ Local Workspace     │
│ Tools / File Access │
└──────────┬──────────┘
           │
           ▼
      User's Project
```

The important design principle is that the model provider does **not** directly access files on the user's computer.

The CodeBound backend handles workspace operations locally.

## 🔐 Local Workspace Model

When a workspace is selected, CodeBound works with the project directory through the local backend.

The intended workflow is:

```text
Select project folder
        ↓
CodeBound accesses the local workspace
        ↓
User asks a coding question/task
        ↓
LLM reasons about the task
        ↓
Local tools inspect relevant files
        ↓
CodeBound prepares a proposed change
        ↓
User reviews the change
        ↓
User approves the change
```

This architecture is intended to avoid sending an entire project to the cloud model unnecessarily.

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* JavaScript

### Backend

* Python
* FastAPI
* HTTPX
* Pydantic Settings

### AI

* OpenRouter
* OpenAI-compatible chat API

### Development Tools

* Git
* GitHub
* VS Code
* CMD / Windows development environment

## 📁 Project Structure

```text
CodeBound/
│
├── backend/
│   ├── agent/
│   │   └── ...
│   ├── api/
│   │   └── ...
│   ├── model/
│   │   ├── __init__.py
│   │   └── client.py
│   ├── workspace/
│   │   └── ...
│   ├── config.py
│   ├── main.py
│   ├── workspace.py
│   └── README_AGENT.md
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── ...
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── scripts/
│
├── .env.example
├── .gitignore
├── README.md
└── requirements.txt
```

## 🚀 Getting Started

### Requirements

You will need:

* Python 3.12+ recommended
* Node.js
* npm
* An OpenRouter API key

A local GPU or GGUF model is **not required** for the current OpenRouter-based setup.

### 1. Clone the repository

```bash
git clone https://github.com/jaydev1710/CodeBound.git
cd CodeBound
```

### 2. Create the environment file

Copy `.env.example` to `.env`.

On Windows CMD:

```cmd
copy .env.example .env
```

Open `.env` and add your OpenRouter API key:

```env
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=openrouter/free
```

Keep the real `.env` file private.

It is intentionally excluded from Git through `.gitignore`.

### 3. Install backend dependencies

```cmd
python -m pip install -r requirements.txt
```

If Windows permissions cause an installation issue, you can use:

```cmd
python -m pip install --user -r requirements.txt
```

### 4. Start the backend

From the project root:

```cmd
python -m uvicorn backend.main:app --reload --port 8000
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

### 5. Install frontend dependencies

Open another terminal:

```cmd
cd frontend
npm install
```

### 6. Start the frontend

```cmd
npm run dev
```

Vite will provide the local development URL, normally similar to:

```text
http://localhost:5173
```

## ⚙️ Environment Configuration

The main environment variables are:

```env
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free

MAX_HISTORY_MESSAGES=8
MAX_TOOL_STEPS=6
MAX_MESSAGE_CHARS=4000

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174
```

### API key security

Never commit your real API key.

The repository uses:

```text
.env
```

for local secrets, while:

```text
.env.example
```

contains only configuration examples.

## 🔄 Changing the Model

The model is configurable through `.env`.

For example:

```env
OPENROUTER_MODEL=openrouter/free
```

A different OpenRouter model can be selected by changing this value, provided that the model is available to the account and compatible with the current application flow.

The goal is to keep model selection separate from the rest of the CodeBound architecture.

## 🧩 Agent Architecture

CodeBound is being developed around an agent-style architecture rather than a simple chatbot.

The basic idea is:

```text
User request
     ↓
Agent
     ↓
LLM reasoning
     ↓
Tool selection
     ↓
Local workspace operation
     ↓
Tool result
     ↓
LLM continues reasoning
     ↓
Response / proposed change
```

Potential workspace tools include operations such as:

```text
list files
search files
read file
create file
edit file
delete file
```

Changes that modify project files are intended to go through an approval step before being applied.

## 🛡️ Security Approach

CodeBound is designed around a local workspace boundary.

The current architecture keeps filesystem operations in the local Python backend rather than giving the remote model direct access to the user's computer.

Important security practices include:

* API keys are stored in `.env`
* `.env` is excluded from Git
* Workspace operations are handled locally
* File modifications can require user approval
* The model provider does not directly receive filesystem access

This is a development project, so additional security hardening is still required before treating CodeBound as a production-grade coding agent.

## 🖥️ Current UI

The interface currently includes:

* Fixed sidebar
* Conversation history
* Workspace path selection
* Workspace connection status
* File browser
* Main chat interface
* Proposed file-change area
* Approval/rejection controls
* Responsive mobile sidebar

The UI is intentionally kept simple so the focus remains on the coding-agent workflow.

## 🧪 Current Development Status

CodeBound is currently an evolving prototype.

### Working areas

* React/Vite frontend
* FastAPI backend
* OpenRouter integration
* Configurable model provider
* Local workspace selection
* Workspace file browsing
* Conversation handling
* Approval-based proposed changes
* Git/GitHub project workflow

### In development

* More robust agent tool calling
* Better automatic workspace understanding
* Improved file search and context selection
* More reliable multi-step coding tasks
* Additional workspace operations
* Testing and command execution workflows
* Better diff and change handling

The project is intentionally being developed incrementally rather than presenting unfinished capabilities as complete features.

## 🗺️ Planned Direction

The longer-term goal is for CodeBound to work more like a local-first coding agent:

```text
Select project
      ↓
Understand workspace
      ↓
User gives task
      ↓
Agent plans
      ↓
Automatically finds relevant files
      ↓
Reads required context
      ↓
Makes a proposed change
      ↓
Shows diff
      ↓
User approves
      ↓
Change is applied
      ↓
Optional tests / verification
```

The goal is to keep the user's project and file operations local while using cloud models for the reasoning component.

## 📌 Why "Local-First"?

CodeBound is called local-first because the **workspace and its operations remain local** even though the current LLM reasoning is cloud-based.

This distinction is important:

```text
Cloud:
    LLM reasoning

Local:
    Workspace
    File access
    Tool execution
    Proposed changes
    User approval
```

The project does not currently attempt to run the entire AI model locally.

## 🤝 Contributing

CodeBound is currently a personal development project and portfolio project.

Suggestions, issues, and improvements are welcome as the architecture develops.

If you find a bug or have an idea for improving the agent workflow, feel free to open an issue or submit a pull request.

## 📄 License

License information will be added as the project develops.
