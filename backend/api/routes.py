from typing import Literal

from fastapi import APIRouter, HTTPException, Request
import httpx
from pydantic import BaseModel, Field

from backend.model.client import ModelUnavailableError
from backend.workspace import WorkspaceError

router = APIRouter(prefix="/api")


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=30)


class WorkspaceSelect(BaseModel):
    path: str = Field(min_length=1, max_length=1000)


@router.get("/health")
async def health(request: Request) -> dict[str, object]:
    settings = request.app.state.settings
    model_server = "unreachable"
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            response = await client.get(f"{settings.llama_server_url.rstrip('/')}/health")
            model_server = "ok" if response.is_success else f"http_{response.status_code}"
    except httpx.HTTPError:
        model_server = "unreachable"
    return {"status": "ok", "model": settings.model_name, "model_server": model_server, "workspace_selected": request.app.state.workspace.selected}


@router.post("/chat")
async def chat(payload: ChatRequest, request: Request) -> dict[str, object]:
    try:
        result = await request.app.state.agent.respond(payload.message.strip(), [item.model_dump() for item in payload.history])
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return result


@router.post("/workspace/select")
async def select_workspace(payload: WorkspaceSelect, request: Request) -> dict[str, object]:
    try:
        path = request.app.state.workspace.select(payload.path)
    except WorkspaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"selected": True, "path": str(path)}


@router.get("/workspace")
async def workspace(request: Request) -> dict[str, object]:
    ws = request.app.state.workspace
    return {"selected": ws.selected, "path": str(ws.root) if ws.root else ""}


@router.get("/workspace/tree")
async def tree(request: Request, path: str = "") -> dict[str, object]:
    try:
        return {"tree": request.app.state.workspace.tree(path)}
    except WorkspaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/changes/{change_id}/approve")
async def approve(change_id: str, request: Request) -> dict[str, object]:
    try:
        return request.app.state.workspace.approve(change_id)
    except WorkspaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/changes/{change_id}/reject")
async def reject(change_id: str, request: Request) -> dict[str, object]:
    try:
        return request.app.state.workspace.reject(change_id)
    except WorkspaceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
