# CodeBound agent notes

The backend keeps the currently selected workspace in process memory. The browser persists the selected path and conversation history locally. Restarting FastAPI clears the server-side workspace selection; the UI re-selects the remembered folder on load.

Writes and deletes are never applied during a model tool call. They create a pending change with a unified diff. The UI must explicitly approve the change before the backend applies it.
