"""
Database connection and session management
"""

from config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Create database engine
engine = create_engine(
    settings.database_url,
    echo=True,  # Log SQL queries (helpful for development)
    future=True,
)

# Session factory for creating database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Base class for SQLAlchemy models
Base = declarative_base()


def get_db():
    """
    Dependency that provides a database session.
    Automatically closes the session when done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
