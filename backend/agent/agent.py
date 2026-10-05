from __future__ import annotations

import json
import re
from typing import Any

from backend.config import Settings
from backend.model.client import LocalModelClient
from backend.workspace import WorkspaceError, WorkspaceManager

SYSTEM_PROMPT = """You are CodeBound, a local coding agent running on the user's computer.
Be useful, concise, and honest. You may inspect and change files only through the tools below.

IMPORTANT TOOL PROTOCOL:
When a tool is needed, output EXACTLY one JSON tool call on its own line in this form:
TOOL_CALL {"name":"list_files","arguments":{"path":""}}
Do not wrap a TOOL_CALL in Markdown fences. Never invent tool results.

Allowed tools:
- list_files: {"path":""}
- read_file: {"path":"relative/file"}
- search_files: {"query":"text","path":""}
- write_file: {"path":"relative/file","content":"full file contents"}
- delete_file: {"path":"relative/file"}

Use tools when the user asks about actual workspace files or requests a change.
For write_file/delete_file, propose the change; CodeBound will show a diff and wait for approval.
After TOOL_RESULT, reason from the returned data. If more information is required, issue another single TOOL_CALL. Otherwise give a normal final answer.
Never claim a write/delete happened unless an approval result exists.
"""

TOOL_RE = re.compile(r"(?:^|\n)\s*TOOL_CALL\s*(\{.*?\})\s*(?=\n|$)", re.DOTALL)


class CodeBoundAgent:
    def __init__(self, model: LocalModelClient, settings: Settings, workspace: WorkspaceManager):
        self.model = model
        self.settings = settings
        self.workspace = workspace

    async def respond(self, message: str, history: list[dict[str, str]]) -> dict[str, Any]:
        recent_history = history[-self.settings.max_history_messages:]
        messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(recent_history)
        messages.append({"role": "user", "content": message})

        events: list[dict[str, Any]] = []
        for step in range(self.settings.max_tool_steps):
            reply = await self.model.chat(messages)
            parsed = self._parse_tool(reply)
            if not parsed:
                return {
                    "reply": self._clean_reply(reply),
                    "events": events,
                    "pending_changes": [self._public_pending(x) for x in self.workspace.pending.values()],
                }

            name = parsed.get("name")
            args = parsed.get("arguments") or {}
            try:
                result = self._run_tool(name, args)
            except (WorkspaceError, KeyError, TypeError) as exc:
                result = {"message": str(exc)}
            events.append({"type": "tool", "name": name, "arguments": args, "result": result, "step": step + 1})
            messages.append({"role": "assistant", "content": f"TOOL_CALL {json.dumps(parsed, ensure_ascii=False)}"})
            messages.append({"role": "user", "content": "TOOL_RESULT " + json.dumps(result, ensure_ascii=False)})

        return {
            "reply": "I reached the tool-step limit. The latest tool results are shown above; you can ask me to continue.",
            "events": events,
            "pending_changes": [self._public_pending(x) for x in self.workspace.pending.values()],
        }

    @staticmethod
    def _clean_reply(reply: str) -> str:
        cleaned = re.sub(r"^\s*TOOL_CALL.*$", "", reply, flags=re.MULTILINE).strip()
        return cleaned or "I could not produce a readable response. Please try again with a simpler request."

    @staticmethod
    def _parse_tool(reply: str) -> dict[str, Any] | None:
        match = TOOL_RE.search(reply)
        if not match:
            return None
        try:
            payload = json.loads(match.group(1))
        except json.JSONDecodeError:
            return None
        if isinstance(payload, dict) and payload.get("name") and isinstance(payload.get("arguments", {}), dict):
            return payload
        return None

    def _run_tool(self, name: str, args: dict[str, Any]) -> Any:
        if not self.workspace.selected:
            return {"message": "No workspace is selected. Ask the user to select a workspace first."}
        if name == "list_files":
            return {"files": self.workspace.tree(str(args.get("path", "")), depth=3)}
        if name == "read_file":
            return {"path": args["path"], "content": self.workspace.read(args["path"])}
        if name == "search_files":
            return {"matches": self.workspace.search(args.get("query", ""), str(args.get("path", "")))}
        if name == "write_file":
            return self.workspace.propose_write(args["path"], args.get("content", ""))
        if name == "delete_file":
            return self.workspace.propose_delete(args["path"])
        return {"message": f"Unknown tool: {name}"}

    @staticmethod
    def _public_pending(item: dict[str, Any]) -> dict[str, Any]:
        return {k: item[k] for k in ("id", "action", "path", "diff") if k in item}
