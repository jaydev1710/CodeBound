from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.agent.agent import CodeBoundAgent
from backend.api.routes import router
from backend.config import get_settings
from backend.model.client import LocalModelClient
from backend.workspace import WorkspaceManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    app.state.workspace = WorkspaceManager()
    app.state.agent = CodeBoundAgent(LocalModelClient(settings), settings, app.state.workspace)
    yield


app = FastAPI(title="CodeBound API", version="1.0.0", lifespan=lifespan)
settings = get_settings()
local_frontend_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(settings.cors_origins + local_frontend_origins)),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
