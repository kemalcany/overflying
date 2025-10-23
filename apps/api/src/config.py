"""
Configuration management using pydantic-settings
Reads from .env file automatically
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings from environment variables"""

    # Database
    database_url: str

    # API Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000"

    # NATS JetStream
    nats_url: str = "nats://localhost:4222"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra env vars (e.g., Render's vars)
    )


# Single instance to use throughout the app
settings = Settings()
