"""Job executor - runs jobs on GPUs"""

import time
import random
from uuid import UUID


class JobExecutor:
    def execute(self, job_id: UUID, job_name: str, gpu_id: int) -> dict:
        """Execute job on GPU (simulated workload)"""
        print(f"[GPU {gpu_id}] Starting job {job_name} ({job_id})")

        # Simulate processing time
        duration = random.uniform(5, 15)
        time.sleep(duration)

        # Simulate success/failure
        success = random.random() > 0.1  # 90% success rate

        result = {
            "success": success,
            "duration_seconds": duration,
            "gpu_id": gpu_id,
            "output": f"Processed {job_name} on GPU {gpu_id}",
        }

        print(
            f"[GPU {gpu_id}] Finished job {job_name} - {'SUCCESS' if success else 'FAILED'}"
        )
        return result
