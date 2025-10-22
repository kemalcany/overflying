"""Test configuration and fixtures for worker tests"""

import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from src.database import Base

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", "postgresql://test:test@localhost:5433/test_db"
)


@pytest.fixture(scope="session")
def test_db_engine():
    """Create test database engine once per session"""
    engine = create_engine(TEST_DATABASE_URL, echo=False, future=True)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_db_engine):
    """Provide a clean database session for each test"""
    connection = test_db_engine.connect()
    transaction = connection.begin()
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = session_local()
    yield session
    session.close()
    transaction.rollback()
    connection.close()
