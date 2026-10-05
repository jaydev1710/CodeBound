from __future__ import annotations

import difflib
import os
from pathlib import Path
from typing import Any


class WorkspaceError(RuntimeError):
    pass


class WorkspaceManager:
    def __init__(self) -> None:
        self.root: Path | None = None
        self.pending: dict[str, dict[str, Any]] = {}

    @property
    def selected(self) -> bool:
        return self.root is not None

    def select(self, raw_path: str) -> Path:
        candidate = Path(raw_path).expanduser().resolve()
        if not candidate.exists() or not candidate.is_dir():
            raise WorkspaceError("Workspace folder does not exist or is not a directory.")
        self.root = candidate
        return candidate

    def _resolve(self, relative: str = "") -> Path:
        if self.root is None:
            raise WorkspaceError("No workspace is selected.")
        if Path(relative).is_absolute():
            raise WorkspaceError("Absolute paths are not allowed.")
        target = (self.root / relative).resolve()
        try:
            target.relative_to(self.root)
        except ValueError as exc:
            raise WorkspaceError("Path is outside the selected workspace.") from exc
        return target

    def tree(self, relative: str = "", depth: int = 2) -> list[dict[str, Any]]:
        target = self._resolve(relative)
        if not target.exists() or not target.is_dir():
            raise WorkspaceError("Folder not found.")

        ignored = {".git", "node_modules", ".venv", "dist", "build", "__pycache__", ".next"}

        def walk(folder: Path, level: int) -> list[dict[str, Any]]:
            if level > depth:
                return []
            items: list[dict[str, Any]] = []
            try:
                children = sorted(folder.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
            except OSError as exc:
                raise WorkspaceError(f"Cannot read folder: {exc}") from exc
            for child in children:
                if child.name in ignored or child.name.startswith(".") and child.name not in {".env.example"}:
                    continue
                item = {"name": child.name, "type": "directory" if child.is_dir() else "file", "path": str(child.relative_to(self.root))}
                if child.is_dir() and level < depth:
                    item["children"] = walk(child, level + 1)
                items.append(item)
            return items

        return walk(target, 0)

    def read(self, relative: str, max_chars: int = 30000) -> str:
        path = self._resolve(relative)
        if not path.exists() or not path.is_file():
            raise WorkspaceError("File not found.")
        if path.stat().st_size > 2_000_000:
            raise WorkspaceError("File is too large to read safely.")
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            raise WorkspaceError("This file is not UTF-8 text.") from exc
        return text[:max_chars]

    def search(self, query: str, relative: str = "") -> list[dict[str, Any]]:
        if not query.strip():
            return []
        base = self._resolve(relative)
        if not base.exists():
            raise WorkspaceError("Search folder not found.")
        ignored = {".git", "node_modules", ".venv", "dist", "build", "__pycache__", ".next"}
        results: list[dict[str, Any]] = []
        for root, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if d not in ignored and not d.startswith(".")]
            for filename in files:
                path = Path(root) / filename
                try:
                    if path.stat().st_size > 1_000_000:
                        continue
                    text = path.read_text(encoding="utf-8")
                except (OSError, UnicodeDecodeError):
                    continue
                for number, line in enumerate(text.splitlines(), start=1):
                    if query.lower() in line.lower():
                        results.append({"path": str(path.relative_to(self.root)), "line": number, "text": line.strip()[:300]})
                        if len(results) >= 80:
                            return results
        return results

    def propose_write(self, relative: str, content: str) -> dict[str, Any]:
        path = self._resolve(relative)
        old = ""
        if path.exists():
            if not path.is_file():
                raise WorkspaceError("Target is not a file.")
            old = self.read(relative, max_chars=100_000)
        diff = "".join(
            difflib.unified_diff(
                old.splitlines(keepends=True),
                content.splitlines(keepends=True),
                fromfile=f"a/{relative}",
                tofile=f"b/{relative}",
            )
        )
        import uuid
        change_id = str(uuid.uuid4())
        item = {"id": change_id, "action": "write", "path": relative, "old": old, "content": content, "diff": diff}
        self.pending[change_id] = item
        return {k: v for k, v in item.items() if k not in {"old", "content"}}

    def propose_delete(self, relative: str) -> dict[str, Any]:
        path = self._resolve(relative)
        if not path.exists() or not path.is_file():
            raise WorkspaceError("File not found.")
        import uuid
        change_id = str(uuid.uuid4())
        item = {"id": change_id, "action": "delete", "path": relative, "old": self.read(relative, max_chars=100_000), "diff": f"--- a/{relative}\n+++ /dev/null\n@@ -1 +0,0 @@\n{self.read(relative, max_chars=100_000)}"}
        self.pending[change_id] = item
        return {k: v for k, v in item.items() if k != "old"}

    def approve(self, change_id: str) -> dict[str, Any]:
        item = self.pending.pop(change_id, None)
        if item is None:
            raise WorkspaceError("Change no longer exists.")
        path = self._resolve(item["path"])
        if item["action"] == "delete":
            path.unlink()
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(item["content"], encoding="utf-8")
        return {"status": "approved", "path": item["path"], "action": item["action"]}

    def reject(self, change_id: str) -> dict[str, Any]:
        if self.pending.pop(change_id, None) is None:
            raise WorkspaceError("Change no longer exists.")
        return {"status": "rejected"}
