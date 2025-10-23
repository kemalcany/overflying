"""Database connection for worker"""

from src.config import settings
from sqlalchemy import TIMESTAMP, Column, Integer, Text, create_engine
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, sessionmaker

engine = create_engine(settings.database_url, echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True)
    name = Column(Text)
    params = Column(JSONB)
    priority = Column(Integer)
    state = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True))
    submitted_by = Column(Text)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
