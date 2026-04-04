from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[2] / ".env", extra="ignore")

    app_name: str = "ticketflow-agent"
    app_env: str = Field(default="development", alias="APP_ENV")
    host: str = "0.0.0.0"
    port: int = Field(default=8080, alias="PORT")
    database_url: str = Field(alias="DATABASE_URL")
    mcp_server_url: str = Field(alias="MCP_SERVER_URL")
    cors_origins: str = Field(default="http://localhost:5173", alias="CORS_ORIGINS")
    google_api_key: str | None = Field(default=None, alias="GOOGLE_API_KEY")
    google_genai_use_vertexai: bool = Field(default=False, alias="GOOGLE_GENAI_USE_VERTEXAI")
    google_cloud_project: str | None = Field(default=None, alias="GOOGLE_CLOUD_PROJECT")
    google_cloud_location: str | None = Field(default="us-central1", alias="GOOGLE_CLOUD_LOCATION")
    gemini_model: str = Field(default="gemini-2.0-flash", alias="GEMINI_MODEL")
    enable_heuristic_fallback: bool = Field(default=True, alias="ENABLE_HEURISTIC_FALLBACK")

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()

    if settings.google_api_key:
        os.environ["GOOGLE_API_KEY"] = settings.google_api_key
    else:
        os.environ.pop("GOOGLE_API_KEY", None)

    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "true" if settings.google_genai_use_vertexai else "false"

    if settings.google_cloud_project:
        os.environ["GOOGLE_CLOUD_PROJECT"] = settings.google_cloud_project
    if settings.google_cloud_location:
        os.environ["GOOGLE_CLOUD_LOCATION"] = settings.google_cloud_location

    return settings
