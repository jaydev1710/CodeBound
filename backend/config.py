from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from the project root .env file."""

    llama_server_url: str = "http://127.0.0.1:8080"
    model_name: str = "qwen2.5-coder-0.5b-instruct-q4_0.gguf"
    model_timeout_seconds: float = 120.0
    max_history_messages: int = 8
    max_tool_steps: int = 6
    max_message_chars: int = 4000
    allowed_origins: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
