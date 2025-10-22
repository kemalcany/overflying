"""Test database connectivity"""

from uuid import uuid4
from datetime import datetime, timezone
from src.database import Job


def test_database_connection(db_session):
    """Test basic database connectivity"""
    job = Job(
        id=uuid4(),
        name="test_job",
        params={"param1": "value1"},
        priority=1,
        state="pending",
        created_at=datetime.now(timezone.utc),
        submitted_by="test_user",
    )
    db_session.add(job)
    db_session.commit()

    retrieved = db_session.query(Job).filter_by(name="test_job").first()
    assert retrieved is not None
    assert retrieved.state == "pending"
    assert retrieved.name == "test_job"


def test_job_state_update(db_session):
    """Test job state transitions"""
    job_id = uuid4()
    job = Job(
        id=job_id,
        name="test",
        params={},
        priority=1,
        state="pending",
        created_at=datetime.now(timezone.utc),
        submitted_by="test",
    )
    db_session.add(job)
    db_session.commit()

    job.state = "processing"
    db_session.commit()

    retrieved = db_session.query(Job).filter_by(id=job_id).first()
    assert retrieved.state == "processing"
