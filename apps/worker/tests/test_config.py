"""Test worker configuration"""

import os
from src.config import Settings


def test_settings_default():
    """Test default settings values"""
    settings = Settings(database_url="postgresql://test:test@localhost/test")
    assert settings.poll_interval == 5
    assert settings.gpu_simulation is True
    assert settings.nats_url == "nats://localhost:4222"


def test_settings_from_env(monkeypatch):
    """Test settings loaded from environment variables"""
    monkeypatch.setenv("DATABASE_URL", "postgresql://custom/db")
    monkeypatch.setenv("POLL_INTERVAL", "10")
    monkeypatch.setenv("GPU_SIMULATION", "false")
    monkeypatch.setenv("NATS_URL", "nats://custom:4222")

    settings = Settings()
    assert settings.database_url == "postgresql://custom/db"
    assert settings.poll_interval == 10
    assert settings.gpu_simulation is False
    assert settings.nats_url == "nats://custom:4222"
