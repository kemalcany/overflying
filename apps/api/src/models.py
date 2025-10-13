"""
SQLAlchemy models for database tables
"""

from database import Base
from sqlalchemy import TIMESTAMP, Column, Integer, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID


class Job(Base):
    """Job model - matches the jobs table in Postgres"""

    __tablename__ = "jobs"

    id = Column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    name = Column(Text, nullable=False)
    params = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    priority = Column(Integer, nullable=False, server_default=text("0"))
    state = Column(Text, nullable=False, server_default=text("'queued'"))
    created_at = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
    submitted_by = Column(Text, nullable=True)

    def __repr__(self):
        return f"<Job(id={self.id}, name={self.name}, state={self.state})>"
