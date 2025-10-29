"""
OpenTelemetry metrics instrumentation for Overflying Worker.

This module sets up OpenTelemetry with Prometheus exporter following best practices:
- Custom business metrics (jobs processed, GPU utilization, execution times)
- System metrics (CPU, memory, disk)
- SQLAlchemy instrumentation (database query metrics)
- Lightweight HTTP server for /metrics endpoint (Prometheus scraping)
"""

import asyncio
from threading import Thread

from aiohttp import web
from opentelemetry import metrics
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.system_metrics import SystemMetricsInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from prometheus_client import REGISTRY, generate_latest
from sqlalchemy import Engine


class WorkerMetricsManager:
    """
    Manages OpenTelemetry metrics collection for the Worker service.

    Since the worker doesn't have a web framework, we create a lightweight
    HTTP server just for Prometheus to scrape /metrics.

    Follows OpenTelemetry semantic conventions:
    - Database metrics: db.* namespace
    - Custom metrics: overflying.worker.* namespace
    """

    def __init__(self, service_name: str = "overflying-worker", metrics_port: int = 8000):
        self.service_name = service_name
        self.metrics_port = metrics_port
        self.meter_provider = None
        self.meter = None
        self.app = None
        self.runner = None

        # Custom metrics instruments
        self.jobs_processed_counter = None
        self.jobs_failed_counter = None
        self.job_execution_time_histogram = None
        self.jobs_in_progress_gauge = None
        self.gpu_utilization_gauge = None
        self.gpu_memory_used_gauge = None
        self.gpu_temperature_gauge = None
        self.poll_cycles_counter = None
        self.nats_events_counter = None

    def setup_metrics(self, engine: Engine = None):
        """
        Initialize OpenTelemetry metrics with Prometheus exporter.

        Args:
            engine: SQLAlchemy engine for database instrumentation
        """
        # Create Prometheus metric reader
        prometheus_reader = PrometheusMetricReader()

        # Create resource with service information
        resource = Resource(attributes={
            SERVICE_NAME: self.service_name,
            "service.version": "0.1.0",
            "service.namespace": "overflying",
            "deployment.environment": "production",  # Should come from config
        })

        # Create MeterProvider with Prometheus reader
        self.meter_provider = MeterProvider(
            resource=resource,
            metric_readers=[prometheus_reader],
        )

        # Set as global meter provider
        metrics.set_meter_provider(self.meter_provider)

        # Get a meter for custom metrics
        self.meter = metrics.get_meter(
            name="overflying.worker",
            version="0.1.0",
        )

        # Setup automatic instrumentation
        self._setup_automatic_instrumentation(engine)

        # Create custom metrics instruments
        self._create_custom_metrics()

        print(f"[Metrics] OpenTelemetry metrics initialized for {self.service_name}")

    def _setup_automatic_instrumentation(self, engine: Engine = None):
        """Setup automatic instrumentation for SQLAlchemy and system metrics."""

        # Instrument SQLAlchemy if engine provided
        if engine:
            SQLAlchemyInstrumentor().instrument(
                engine=engine,
                meter_provider=self.meter_provider,
            )
            print("[Metrics] SQLAlchemy automatic instrumentation enabled")

        # Instrument system metrics (CPU, memory, disk)
        SystemMetricsInstrumentor().instrument(
            meter_provider=self.meter_provider,
        )
        print("[Metrics] System metrics instrumentation enabled")

    def _create_custom_metrics(self):
        """Create custom business metrics for Overflying Worker."""

        # Job processing metrics
        self.jobs_processed_counter = self.meter.create_counter(
            name="overflying.worker.jobs.processed",
            description="Total number of jobs processed successfully",
            unit="1",
        )

        self.jobs_failed_counter = self.meter.create_counter(
            name="overflying.worker.jobs.failed",
            description="Total number of jobs that failed",
            unit="1",
        )

        self.job_execution_time_histogram = self.meter.create_histogram(
            name="overflying.worker.job.execution_time",
            description="Job execution time in seconds",
            unit="s",
        )

        self.jobs_in_progress_gauge = self.meter.create_up_down_counter(
            name="overflying.worker.jobs.in_progress",
            description="Number of jobs currently being processed",
            unit="1",
        )

        # GPU metrics
        self.gpu_utilization_gauge = self.meter.create_gauge(
            name="overflying.worker.gpu.utilization",
            description="GPU utilization percentage (0-100)",
            unit="%",
        )

        self.gpu_memory_used_gauge = self.meter.create_gauge(
            name="overflying.worker.gpu.memory_used",
            description="GPU memory used in bytes",
            unit="By",
        )

        self.gpu_temperature_gauge = self.meter.create_gauge(
            name="overflying.worker.gpu.temperature",
            description="GPU temperature in Celsius",
            unit="Cel",
        )

        # Worker loop metrics
        self.poll_cycles_counter = self.meter.create_counter(
            name="overflying.worker.poll_cycles",
            description="Total number of poll cycles executed",
            unit="1",
        )

        # NATS metrics
        self.nats_events_counter = self.meter.create_counter(
            name="overflying.worker.nats.events.published",
            description="Total number of events published to NATS",
            unit="1",
        )

        print("[Metrics] Custom worker metrics created")

    async def start_metrics_server(self):
        """Start a lightweight HTTP server for /metrics endpoint."""
        self.app = web.Application()
        self.app.router.add_get('/metrics', self._metrics_handler)
        self.app.router.add_get('/health', self._health_handler)

        self.runner = web.AppRunner(self.app)
        await self.runner.setup()

        site = web.TCPSite(self.runner, '0.0.0.0', self.metrics_port)
        await site.start()

        print(f"[Metrics] HTTP server started on port {self.metrics_port}")
        print(f"[Metrics] Prometheus endpoint available at http://0.0.0.0:{self.metrics_port}/metrics")

    async def stop_metrics_server(self):
        """Stop the metrics HTTP server."""
        if self.runner:
            await self.runner.cleanup()
            print("[Metrics] HTTP server stopped")

    async def _metrics_handler(self, request):
        """Handle /metrics endpoint for Prometheus scraping."""
        metrics_data = generate_latest(REGISTRY)
        return web.Response(
            body=metrics_data,
            content_type='text/plain; version=0.0.4; charset=utf-8',
        )

    async def _health_handler(self, request):
        """Handle /health endpoint."""
        return web.json_response({"status": "healthy", "service": self.service_name})

    def record_job_processed(self, job_id: str, job_name: str, execution_time: float):
        """Record a successfully processed job."""
        if not self.jobs_processed_counter or not self.job_execution_time_histogram:
            return

        self.jobs_processed_counter.add(
            1,
            attributes={
                "job_name": job_name,
            },
        )
        self.job_execution_time_histogram.record(
            execution_time,
            attributes={
                "job_name": job_name,
            },
        )

    def record_job_failed(self, job_id: str, job_name: str, error: str = None):
        """Record a failed job."""
        if not self.jobs_failed_counter:
            return

        attributes = {"job_name": job_name}
        if error:
            attributes["error_type"] = error[:50]  # Limit error string length

        self.jobs_failed_counter.add(1, attributes=attributes)

    def record_job_started(self):
        """Record a job starting."""
        if self.jobs_in_progress_gauge:
            self.jobs_in_progress_gauge.add(1)

    def record_job_finished(self):
        """Record a job finishing."""
        if self.jobs_in_progress_gauge:
            self.jobs_in_progress_gauge.add(-1)

    def record_poll_cycle(self, jobs_found: bool):
        """Record a poll cycle."""
        if not self.poll_cycles_counter:
            return

        self.poll_cycles_counter.add(
            1,
            attributes={
                "jobs_found": str(jobs_found),
            },
        )

    def record_nats_event(self, event_type: str, subject: str):
        """Record a NATS event publication."""
        if not self.nats_events_counter:
            return

        self.nats_events_counter.add(
            1,
            attributes={
                "event_type": event_type,
                "subject": subject,
            },
        )

    def update_gpu_metrics(self, gpu_id: str, utilization: float, memory_used: int, temperature: float):
        """
        Update GPU metrics.

        Note: Gauges in OpenTelemetry SDK currently require callback functions.
        For now, we'll use observable gauges in a future update.
        This is a placeholder for the interface.
        """
        # TODO: Implement observable gauges with callbacks
        # For now, metrics are updated via the GPU manager directly
        pass


# Global metrics manager instance
worker_metrics_manager = WorkerMetricsManager()
