import httpx

from backend.config import Settings


class ModelUnavailableError(RuntimeError):
    """Raised when the local llama.cpp server cannot serve a request."""


class LocalModelClient:
    """Small client for llama.cpp's OpenAI-compatible chat endpoint."""

    def __init__(self, settings: Settings):
        self.settings = settings

    async def chat(self, messages: list[dict[str, str]]) -> str:
        url = f"{self.settings.llama_server_url.rstrip('/')}/v1/chat/completions"
        payload = {
            "model": self.settings.model_name,
            "messages": messages,
            "temperature": 0.15,
            "top_p": 0.9,
            "max_tokens": 512,
            "stream": False,
        }
        try:
            async with httpx.AsyncClient(timeout=self.settings.model_timeout_seconds) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise ModelUnavailableError(
                "The local model took too long to respond. On a 4 GB CPU PC, simple requests may take a while; try a shorter prompt."
            ) from exc
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500]
            raise ModelUnavailableError(f"llama.cpp returned HTTP {exc.response.status_code}: {detail}") from exc
        except httpx.HTTPError as exc:
            raise ModelUnavailableError(
                "Could not reach llama.cpp at 127.0.0.1:8080. Make sure llama-server is still running."
            ) from exc

        try:
            data = response.json()
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise ModelUnavailableError("The local model returned an unexpected response.") from exc

        if not isinstance(content, str) or not content.strip():
            raise ModelUnavailableError("The local model returned an empty response.")
        return content.strip()
