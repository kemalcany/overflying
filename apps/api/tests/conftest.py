"""
Test configuration and fixtures for pytest
"""

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from src.database import Base, get_db
from src.main import app

# Test database URL - uses port 5433 to avoid conflicts with dev DB
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", "postgresql://test:test@localhost:5433/test_db"
)


@pytest.fixture(scope="session")
def test_db_engine():
    """
    Create test database engine once per test session.
    Creates all tables at start and drops them at end.
    """
    engine = create_engine(TEST_DATABASE_URL, echo=False, future=True)

    # Create all tables
    Base.metadata.create_all(bind=engine)

    yield engine

    # Drop all tables after tests
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_db_engine) -> Generator[Session, None, None]:
    """
    Provide a clean database session for each test.
    Uses transaction rollback to ensure test isolation.
    """
    connection = test_db_engine.connect()
    transaction = connection.begin()

    # Create session bound to this connection
    test_session_local = sessionmaker(
        autocommit=False, autoflush=False, bind=connection
    )
    session = test_session_local()

    yield session

    # Rollback transaction to undo any changes
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    Provide FastAPI TestClient with overridden database dependency.
    """

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # Session cleanup handled by db_session fixture

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    # Clean up dependency override
    app.dependency_overrides.clear()
