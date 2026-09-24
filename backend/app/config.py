"""Application configuration using Pydantic Settings."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Paths
    model_dir: Path = Path(__file__).parent.parent.parent / "models"

    # CORS
    allowed_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "https://weirdgamer20.github.io"
    )

    # Rate limiting
    rate_limit_per_minute: int = 60

    # Chat provider: "rule_based", "gemini", "openai"
    chat_provider: str = "rule_based"
    gemini_api_key: str = ""
    openai_api_key: str = ""

    # Image upload limits
    max_image_bytes: int = 10 * 1024 * 1024
    allowed_image_mimes: list[str] = ["image/jpeg", "image/png", "image/webp"]

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
