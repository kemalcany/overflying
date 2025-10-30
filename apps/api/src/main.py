"""
Overflying API - FastAPI service for GPU job orchestration and work scheduling
"""

import json
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .config import settings
from .database import engine, get_db
from .metrics import metrics_manager
from .models import Job
from .nats_client import NATSManager
from .schemas import JobCreate, JobResponse, JobUpdate

# Global NATS manager instance
nats_manager = NATSManager(settings.nats_url)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan event handler"""
    # Startup: Initialize metrics
    try:
        metrics_manager.setup_metrics(app, engine)
        print("[API] Metrics initialized")
    except Exception as e:
        print(f"[API] WARNING: Could not initialize metrics: {e}")

    # Startup: Connect to NATS (non-blocking, allows API to start without NATS)
    try:
        await nats_manager.connect()
        await nats_manager.ensure_stream("JOBS", ["jobs.>"])
        print("[API] Connected to NATS JetStream")
        metrics_manager.set_nats_connection_status(True)
    except Exception as e:
        print(f"[API] WARNING: Could not connect to NATS: {e}")
        print("[API] API will run without real-time updates. Start NATS to enable SSE.")
        metrics_manager.set_nats_connection_status(False)

    yield

    # Shutdown: Disconnect from NATS
    try:
        await nats_manager.disconnect()
        print("[API] Disconnected from NATS")
        metrics_manager.set_nats_connection_status(False)
    except Exception as e:
        print(f"[API] Failed to disconnect from NATS: {e}")


app = FastAPI(
    title="Overflying API",
    description="GPU task orchestrator with real-time insights",
    version="0.1.0",
    lifespan=lifespan,
)

# Parse CORS origins from settings
cors_origins = settings.cors_origins.split(",")
print(f"[API] CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add metrics middleware
app.middleware("http")(metrics_manager.create_timing_middleware())


@app.get("/")
async def root():
    """Root endpoint - API info"""
    return {"name": "Overflying API", "version": "0.1.0", "status": "running"}


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

    # Record metrics
    metrics_manager.record_job_created(
        priority=job_data.priority,
        submitted_by=job_data.submitted_by,
    )

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


@app.post("/admin/purge-stream")
async def purge_stream(stream_name: str = "JOBS"):
    """Purge all messages from a JetStream stream (dev only)"""
    try:
        await nats_manager.purge_stream(stream_name)
        return {"message": f"Stream {stream_name} purged"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/events")
async def job_events_stream(request: Request):
    """
    Server-Sent Events (SSE) endpoint for real-time job updates.
    Subscribes to NATS JetStream and streams events to connected clients.
    """

    async def event_generator():
        """Generate SSE events from NATS JetStream"""
        # Check if NATS is connected
        if not nats_manager.nc or not nats_manager.nc.is_connected:
            yield f"data: {json.dumps({'type': 'error', 'message': 'NATS not available. Start NATS and restart API.'})}\n\n"
            return

        # Create a unique consumer for this SSE connection
        consumer_name = f"api-sse-{id(request)}"

        try:
            # Subscribe to NATS JetStream
            await nats_manager.create_consumer(
                "JOBS", consumer_name, filter_subject="jobs.>"
            )
            psub = await nats_manager.js.pull_subscribe_bind(
                durable=consumer_name,
                stream="JOBS",
            )

            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected', 'message': 'SSE stream established'})}\n\n"

            # Track SSE connection
            metrics_manager.increment_sse_connections()

            # Stream events to client
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    print(f"[SSE] Client disconnected: {consumer_name}")
                    break

                try:
                    # Pull messages from NATS with timeout
                    msgs = await psub.fetch(batch=1, timeout=1.0)

                    for msg in msgs:
                        data = json.loads(msg.data.decode())
                        # Format as SSE event
                        yield f"data: {json.dumps(data)}\n\n"
                        await msg.ack()

                except TimeoutError:
                    # Send keepalive comment every second to prevent connection timeout
                    yield ": keepalive\n\n"
                    continue

        except Exception as e:
            print(f"[SSE] Error in event stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            # Track SSE disconnection
            metrics_manager.decrement_sse_connections()

            # Cleanup: Delete the consumer
            try:
                await nats_manager.js.delete_consumer("JOBS", consumer_name)
                print(f"[SSE] Cleaned up consumer: {consumer_name}")
            except Exception as e:
                print(f"[SSE] Failed to cleanup consumer {consumer_name}: {e}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
