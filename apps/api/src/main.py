"""
Constellation API - FastAPI service for GPU job orchestration
"""

from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import get_db
from .models import Job
from .schemas import JobCreate, JobResponse, JobUpdate

app = FastAPI(
    title="Constellation API",
    description="GPU task orchestrator with real-time insights",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],  # Or ["*"] to allow all origins (not recommended for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - API info"""
    return {"name": "Constellation API", "version": "0.1.0", "status": "running"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "environment": "testing-approval-workflow"}


@app.get("/jobs", response_model=list[JobResponse])
async def list_jobs(db: Session = Depends(get_db)):
    """Get all jobs from the database"""
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return jobs


@app.post("/jobs", response_model=JobResponse, status_code=201)
async def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    """Create a new job"""
    job = Job(
        name=job_data.name,
        params=job_data.params,
        priority=job_data.priority,
        submitted_by=job_data.submitted_by,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@app.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: UUID, db: Session = Depends(get_db)):
    """Get a single job by ID"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


@app.put("/jobs/{job_id}", response_model=JobResponse)
async def update_job(job_id: UUID, job_data: JobUpdate, db: Session = Depends(get_db)):
    """Update an existing job"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Update only provided fields
    update_data = job_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return job


@app.delete("/jobs/{job_id}", status_code=204)
async def delete_job(job_id: UUID, db: Session = Depends(get_db)):
    """Delete a job"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    db.delete(job)
    db.commit()
    return None
