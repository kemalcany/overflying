"""Worker main loop"""

import time

from config import settings
from database import SessionLocal
from executor import JobExecutor
from gpu_manager import GPUManager
from sqlalchemy import text


class Worker:
    def __init__(self):
        self.gpu_manager = GPUManager(simulation=settings.gpu_simulation)
        self.executor = JobExecutor()
        self.db = SessionLocal()
        print(f"Worker started with {len(self.gpu_manager.gpus)} GPUs")

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

    def process_job(self, job_row):
        """Process a single job"""
        job_id, job_name, params = job_row

        # Get available GPU
        gpu = self.gpu_manager.get_available_gpu()
        if not gpu:
            print("No GPU available, requeueing job")
            self.db.execute(
                text("UPDATE jobs SET state = 'queued' WHERE id = :id"),
                {"id": job_id},
            )
            self.db.commit()
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
        finally:
            self.gpu_manager.release_gpu(gpu.id)

    def run(self):
        """Main worker loop"""
        print("Worker running, polling every", settings.poll_interval, "seconds...")

        while True:
            try:
                # Update GPU metrics
                self.gpu_manager.update_metrics()

                # Poll for job
                job = self.poll_jobs()
                if job:
                    self.process_job(job)
                else:
                    time.sleep(settings.poll_interval)

            except KeyboardInterrupt:
                print("\nShutting down worker...")
                break
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(settings.poll_interval)

        self.db.close()


if __name__ == "__main__":
    worker = Worker()
    worker.run()
