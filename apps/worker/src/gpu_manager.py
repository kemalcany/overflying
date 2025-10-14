"""GPU detection and monitoring (simulation mode for M3 Macs)"""

import random
import time
from dataclasses import dataclass


@dataclass
class GPU:
    id: int
    name: str
    memory_total: int  # MB
    memory_used: int
    utilization: int  # %
    temperature: int  # Celsius
    available: bool = True


class GPUManager:
    def __init__(self, simulation: bool = True):
        self.simulation = simulation
        self.gpus = self._detect_gpus()

    def _detect_gpus(self) -> list[GPU]:
        if self.simulation:
            # Simulate 2 NVIDIA GPUs for demo
            return [
                GPU(
                    id=0,
                    name="NVIDIA RTX 4090 (simulated)",
                    memory_total=24576,
                    memory_used=0,
                    utilization=0,
                    temperature=45,
                ),
                GPU(
                    id=1,
                    name="NVIDIA RTX 4090 (simulated)",
                    memory_total=24576,
                    memory_used=0,
                    utilization=0,
                    temperature=47,
                ),
            ]
        # Real GPU detection with pynvml would go here
        return []

    def get_available_gpu(self) -> GPU | None:
        for gpu in self.gpus:
            if gpu.available and gpu.memory_used < gpu.memory_total * 0.8:
                return gpu
        return None

    def allocate_gpu(self, gpu_id: int):
        self.gpus[gpu_id].available = False

    def release_gpu(self, gpu_id: int):
        self.gpus[gpu_id].available = True
        self.gpus[gpu_id].memory_used = 0
        self.gpus[gpu_id].utilization = 0

    def update_metrics(self):
        """Simulate GPU metrics changing"""
        for gpu in self.gpus:
            if not gpu.available:
                gpu.memory_used = random.randint(8000, 20000)
                gpu.utilization = random.randint(70, 95)
                gpu.temperature = random.randint(65, 82)

    def get_status(self) -> dict:
        return {
            "gpus": [
                {
                    "id": g.id,
                    "name": g.name,
                    "memory_used_mb": g.memory_used,
                    "memory_total_mb": g.memory_total,
                    "utilization_percent": g.utilization,
                    "temperature_c": g.temperature,
                    "available": g.available,
                }
                for g in self.gpus
            ]
        }
