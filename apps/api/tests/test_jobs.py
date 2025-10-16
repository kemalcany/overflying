"""
Tests for job CRUD endpoints
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.models import Job


class TestCreateJob:
    """Tests for POST /jobs endpoint"""

    def test_create_job_minimal(self, client: TestClient):
        """Test creating a job with only required fields"""
        response = client.post("/jobs", json={"name": "Test Job"})

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Job"
        assert data["params"] == {}
        assert data["priority"] == 0
        assert data["state"] == "queued"
        assert data["submitted_by"] is None
        assert "id" in data
        assert "created_at" in data

    def test_create_job_with_all_fields(self, client: TestClient):
        """Test creating a job with all fields"""
        payload = {
            "name": "Full Test Job",
            "params": {"gpu_count": 4, "memory": "32GB"},
            "priority": 10,
            "submitted_by": "test_user",
        }
        response = client.post("/jobs", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Full Test Job"
        assert data["params"] == {"gpu_count": 4, "memory": "32GB"}
        assert data["priority"] == 10
        assert data["submitted_by"] == "test_user"

    def test_create_job_missing_name(self, client: TestClient):
        """Test that creating a job without name fails"""
        response = client.post("/jobs", json={})

        assert response.status_code == 422  # Validation error

    def test_create_job_empty_name(self, client: TestClient):
        """Test that creating a job with empty name fails"""
        response = client.post("/jobs", json={"name": ""})

        assert response.status_code == 422  # Validation error


class TestListJobs:
    """Tests for GET /jobs endpoint"""

    def test_list_jobs_empty(self, client: TestClient):
        """Test listing jobs when database is empty"""
        response = client.get("/jobs")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_jobs_multiple(self, client: TestClient, db_session: Session):
        """Test listing multiple jobs"""
        # Create test jobs directly in DB
        job1 = Job(name="Job 1", priority=5)
        job2 = Job(name="Job 2", priority=10)
        job3 = Job(name="Job 3", priority=1)
        db_session.add_all([job1, job2, job3])
        db_session.commit()

        response = client.get("/jobs")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        # Should be ordered by created_at desc (most recent first)
        assert all("id" in job for job in data)
        assert all("name" in job for job in data)

    def test_list_jobs_ordered_by_created_at(
        self, client: TestClient, db_session: Session
    ):
        """Test that jobs are ordered by created_at descending"""
        # Create jobs with explicit timestamps to ensure ordering
        now = datetime.now(UTC)

        job1 = Job(name="First Job", priority=1)
        job1.created_at = now - timedelta(seconds=1)  # Older job
        db_session.add(job1)

        job2 = Job(name="Second Job", priority=2)
        job2.created_at = now  # Newer job
        db_session.add(job2)

        db_session.commit()

        response = client.get("/jobs")
        data = response.json()

        # Most recent should be first
        assert len(data) == 2
        assert data[0]["name"] == "Second Job"
        assert data[1]["name"] == "First Job"


class TestGetJob:
    """Tests for GET /jobs/{job_id} endpoint"""

    def test_get_job_success(self, client: TestClient, db_session: Session):
        """Test getting a single job by ID"""
        job = Job(name="Test Job", priority=5, params={"key": "value"})
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        response = client.get(f"/jobs/{job.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(job.id)
        assert data["name"] == "Test Job"
        assert data["priority"] == 5
        assert data["params"] == {"key": "value"}

    def test_get_job_not_found(self, client: TestClient):
        """Test getting a non-existent job"""
        fake_id = uuid4()
        response = client.get(f"/jobs/{fake_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_job_invalid_uuid(self, client: TestClient):
        """Test getting a job with invalid UUID"""
        response = client.get("/jobs/not-a-uuid")

        assert response.status_code == 422  # Validation error


class TestUpdateJob:
    """Tests for PUT /jobs/{job_id} endpoint"""

    def test_update_job_name(self, client: TestClient, db_session: Session):
        """Test updating job name"""
        job = Job(name="Original Name", priority=1)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        response = client.put(f"/jobs/{job.id}", json={"name": "Updated Name"})

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["priority"] == 1  # Unchanged

    def test_update_job_priority(self, client: TestClient, db_session: Session):
        """Test updating job priority"""
        job = Job(name="Test Job", priority=1)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        response = client.put(f"/jobs/{job.id}", json={"priority": 100})

        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == 100
        assert data["name"] == "Test Job"  # Unchanged

    def test_update_job_params(self, client: TestClient, db_session: Session):
        """Test updating job params"""
        job = Job(name="Test Job", params={"old": "value"})
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        new_params = {"new": "params", "count": 42}
        response = client.put(f"/jobs/{job.id}", json={"params": new_params})

        assert response.status_code == 200
        data = response.json()
        assert data["params"] == new_params

    def test_update_job_multiple_fields(self, client: TestClient, db_session: Session):
        """Test updating multiple fields at once"""
        job = Job(name="Original", priority=1, submitted_by="user1")
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        update_data = {
            "name": "Updated",
            "priority": 10,
            "submitted_by": "user2",
        }
        response = client.put(f"/jobs/{job.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated"
        assert data["priority"] == 10
        assert data["submitted_by"] == "user2"

    def test_update_job_partial(self, client: TestClient, db_session: Session):
        """Test partial update (only some fields)"""
        job = Job(name="Test Job", priority=5, params={"key": "value"})
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        # Only update priority
        response = client.put(f"/jobs/{job.id}", json={"priority": 99})

        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == 99
        assert data["name"] == "Test Job"  # Unchanged
        assert data["params"] == {"key": "value"}  # Unchanged

    def test_update_job_not_found(self, client: TestClient):
        """Test updating a non-existent job"""
        fake_id = uuid4()
        response = client.put(f"/jobs/{fake_id}", json={"name": "New Name"})

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_update_job_empty_name(self, client: TestClient, db_session: Session):
        """Test that updating with empty name fails"""
        job = Job(name="Test Job", priority=1)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)

        response = client.put(f"/jobs/{job.id}", json={"name": ""})

        assert response.status_code == 422  # Validation error

    def test_update_job_invalid_uuid(self, client: TestClient):
        """Test updating a job with invalid UUID"""
        response = client.put("/jobs/not-a-uuid", json={"name": "New Name"})

        assert response.status_code == 422  # Validation error


class TestDeleteJob:
    """Tests for DELETE /jobs/{job_id} endpoint"""

    def test_delete_job_success(self, client: TestClient, db_session: Session):
        """Test deleting a job"""
        job = Job(name="Job to Delete", priority=1)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)
        job_id = job.id

        response = client.delete(f"/jobs/{job_id}")

        assert response.status_code == 204
        assert response.content == b""

        # Verify job is deleted
        deleted_job = db_session.query(Job).filter(Job.id == job_id).first()
        assert deleted_job is None

    def test_delete_job_not_found(self, client: TestClient):
        """Test deleting a non-existent job"""
        fake_id = uuid4()
        response = client.delete(f"/jobs/{fake_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_delete_job_invalid_uuid(self, client: TestClient):
        """Test deleting a job with invalid UUID"""
        response = client.delete("/jobs/not-a-uuid")

        assert response.status_code == 422  # Validation error

    def test_delete_job_idempotent_check(self, client: TestClient, db_session: Session):
        """Test that deleting the same job twice returns 404 on second attempt"""
        job = Job(name="Job to Delete", priority=1)
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)
        job_id = job.id

        # First delete
        response1 = client.delete(f"/jobs/{job_id}")
        assert response1.status_code == 204

        # Second delete
        response2 = client.delete(f"/jobs/{job_id}")
        assert response2.status_code == 404


class TestRootAndHealth:
    """Tests for root and health endpoints"""

    def test_root_endpoint(self, client: TestClient):
        """Test root endpoint returns API info"""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert data["status"] == "running"

    def test_health_endpoint(self, client: TestClient):
        """Test health check endpoint"""
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
