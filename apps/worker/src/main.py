"""Worker main loop"""

import asyncio
import time
from datetime import datetime

from src.config import settings
from src.database import SessionLocal, engine
from src.executor import JobExecutor
from src.gpu_manager import GPUManager
from src.metrics import worker_metrics_manager
from src.nats_client import NATSManager
from sqlalchemy import text


class Worker:
    def __init__(self):
        self.gpu_manager = GPUManager(simulation=settings.gpu_simulation)
        self.executor = JobExecutor()
        self.db = SessionLocal()
        self.nats = NATSManager(settings.nats_url)
        self.metrics = worker_metrics_manager
        print(f"Worker started with {len(self.gpu_manager.gpus)} GPUs")

    async def publish_job_event(self, job_id: str, state: str, metadata: dict = None):
        """Publish job state change event to NATS JetStream"""
        event_data = {
            "job_id": str(job_id),
            "state": state,
            "timestamp": datetime.utcnow().isoformat(),
            **(metadata or {}),
        }

        subject = f"jobs.{job_id}.{state}"
        await self.nats.publish(subject, event_data)

        # Record metrics
        self.metrics.record_nats_event(event_type=state, subject=subject)

    def poll_jobs(self):
        """Poll for jobs using SKIP LOCKED pattern"""
        query = text("""
            UPDATE jobs
            SET state = 'running'
            WHERE id = (
                SELECT id FROM jobs
                WHERE state = 'queued'
                ORDER BY priority DESC, created_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            RETURNING id, name, params
        """)

        result = self.db.execute(query)
        self.db.commit()
        return result.fetchone()

    async def process_job(self, job_row):
        """Process a single job"""
        job_id, job_name, params = job_row

        # Record job started
        self.metrics.record_job_started()

        # Publish job started event
        await self.publish_job_event(job_id, "running", {"name": job_name})

        # Get available GPU
        gpu = self.gpu_manager.get_available_gpu()
        if not gpu:
            print("No GPU available, requeueing job")
            self.db.execute(
                text("UPDATE jobs SET state = 'queued' WHERE id = :id"),
                {"id": job_id},
            )
            self.db.commit()
            await self.publish_job_event(job_id, "queued", {"reason": "no_gpu_available"})
            return

        # Allocate GPU and execute
        self.gpu_manager.allocate_gpu(gpu.id)
        try:
            result = self.executor.execute(job_id, job_name, gpu.id)

            # Update job state
            new_state = "completed" if result["success"] else "failed"
            self.db.execute(
                text("UPDATE jobs SET state = :state WHERE id = :id"),
                {"state": new_state, "id": job_id},
            )
            self.db.commit()

            # Publish completion event
            await self.publish_job_event(
                job_id,
                new_state,
                {
                    "name": job_name,
                    "gpu_id": gpu.id,
                    "execution_time": result.get("execution_time", 0),
                },
            )

            # Record metrics
            if result["success"]:
                self.metrics.record_job_processed(
                    job_id=str(job_id),
                    job_name=job_name,
                    execution_time=result.get("execution_time", 0),
                )
            else:
                self.metrics.record_job_failed(
                    job_id=str(job_id),
                    job_name=job_name,
                )

        except Exception as e:
            # Publish failure event
            await self.publish_job_event(job_id, "failed", {"error": str(e)})

            # Record failure metric
            self.metrics.record_job_failed(
                job_id=str(job_id),
                job_name=job_name,
                error=str(e),
            )
            raise
        finally:
            self.gpu_manager.release_gpu(gpu.id)
            self.metrics.record_job_finished()

    async def run(self):
        """Main worker loop"""
        print("Worker running, polling every", settings.poll_interval, "seconds...")

        # Initialize metrics
        self.metrics.setup_metrics(engine)

        # Start metrics HTTP server
        await self.metrics.start_metrics_server()

        # Connect to NATS and ensure stream exists
        await self.nats.connect()
        await self.nats.ensure_stream("JOBS", ["jobs.>"])

        try:
            while True:
                try:
                    # Update GPU metrics
                    self.gpu_manager.update_metrics()

                    # Poll for job
                    job = self.poll_jobs()

                    # Record poll cycle
                    self.metrics.record_poll_cycle(jobs_found=(job is not None))

                    if job:
                        await self.process_job(job)
                    else:
                        await asyncio.sleep(settings.poll_interval)

                except KeyboardInterrupt:
                    print("\nShutting down worker...")
                    break
                except Exception as e:
                    print(f"Error: {e}")
                    await asyncio.sleep(settings.poll_interval)
        finally:
            await self.nats.disconnect()
            await self.metrics.stop_metrics_server()
            self.db.close()


if __name__ == "__main__":
    worker = Worker()
    asyncio.run(worker.run())
