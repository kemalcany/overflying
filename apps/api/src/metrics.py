"""
OpenTelemetry metrics instrumentation for Overflying API.

This module sets up OpenTelemetry with Prometheus exporter following best practices:
- Automatic instrumentation for FastAPI (HTTP requests, response times)
- Custom business metrics (jobs created, database queries, NATS events)
- System metrics (CPU, memory, disk)
- SQLAlchemy instrumentation (database query metrics)
"""

import time
from collections.abc import Callable

from fastapi import FastAPI, Request, Response
from opentelemetry import metrics
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.system_metrics import SystemMetricsInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from prometheus_client import REGISTRY, generate_latest
from sqlalchemy import Engine


class MetricsManager:
    """
    Manages OpenTelemetry metrics collection and Prometheus export.

    Follows OpenTelemetry semantic conventions:
    - HTTP metrics: http.server.* namespace
    - Database metrics: db.* namespace
    - Custom metrics: overflying.* namespace
    """

    def __init__(self, service_name: str = "overflying-api"):
        self.service_name = service_name
        self.meter_provider = None
        self.meter = None

        # Custom metrics instruments
        self.jobs_created_counter = None
        self.jobs_total_gauge = None
        self.jobs_by_status_gauge = None
        self.nats_events_counter = None
        self.nats_connection_status = None
        self.sse_connections_gauge = None
        self.request_duration_histogram = None

    def setup_metrics(self, app: FastAPI, engine: Engine = None):
        """
        Initialize OpenTelemetry metrics with Prometheus exporter.

        Args:
            app: FastAPI application instance
            engine: SQLAlchemy engine for database instrumentation
        """
        # Create Prometheus metric reader
        prometheus_reader = PrometheusMetricReader()

        # Create resource with service information
        resource = Resource(
            attributes={
                SERVICE_NAME: self.service_name,
                "service.version": "0.1.0",
                "service.namespace": "overflying",
                "deployment.environment": "production",  # Should come from config
            }
        )

        # Create MeterProvider with Prometheus reader
        self.meter_provider = MeterProvider(
            resource=resource,
            metric_readers=[prometheus_reader],
        )

        # Set as global meter provider
        metrics.set_meter_provider(self.meter_provider)

        # Get a meter for custom metrics
        self.meter = metrics.get_meter(
            name="overflying.api",
            version="0.1.0",
        )

        # Setup automatic instrumentation
        self._setup_automatic_instrumentation(app, engine)

        # Create custom metrics instruments
        self._create_custom_metrics()

        # Add metrics endpoint
        self._add_metrics_endpoint(app)

        print(f"[Metrics] OpenTelemetry metrics initialized for {self.service_name}")
        print("[Metrics] Prometheus endpoint available at /metrics")

    def _setup_automatic_instrumentation(self, app: FastAPI, engine: Engine = None):
        """Setup automatic instrumentation for FastAPI and SQLAlchemy."""

        # Instrument FastAPI (HTTP metrics)
        FastAPIInstrumentor.instrument_app(
            app,
            meter_provider=self.meter_provider,
        )
        print("[Metrics] FastAPI automatic instrumentation enabled")

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
        """Create custom business metrics for Overflying."""

        # Job metrics
        self.jobs_created_counter = self.meter.create_counter(
            name="overflying.jobs.created",
            description="Total number of jobs created",
            unit="1",
        )

        self.jobs_total_gauge = self.meter.create_up_down_counter(
            name="overflying.jobs.total",
            description="Current total number of jobs in the system",
            unit="1",
        )

        self.jobs_by_status_gauge = self.meter.create_up_down_counter(
            name="overflying.jobs.by_status",
            description="Number of jobs by status (queued, running, completed, failed)",
            unit="1",
        )

        # NATS metrics
        self.nats_events_counter = self.meter.create_counter(
            name="overflying.nats.events.published",
            description="Total number of events published to NATS",
            unit="1",
        )

        self.nats_connection_status = self.meter.create_up_down_counter(
            name="overflying.nats.connection.status",
            description="NATS connection status (1=connected, 0=disconnected)",
            unit="1",
        )

        # SSE metrics
        self.sse_connections_gauge = self.meter.create_up_down_counter(
            name="overflying.sse.connections.active",
            description="Number of active SSE connections",
            unit="1",
        )

        # HTTP request duration (custom, more detailed than auto-instrumentation)
        self.request_duration_histogram = self.meter.create_histogram(
            name="overflying.http.request.duration",
            description="HTTP request duration in seconds",
            unit="s",
        )

        print("[Metrics] Custom business metrics created")

    def _add_metrics_endpoint(self, app: FastAPI):
        """Add /metrics endpoint for Prometheus scraping."""

        @app.get("/metrics")
        async def metrics_endpoint():
            """Prometheus metrics endpoint."""
            return Response(
                content=generate_latest(REGISTRY),
                media_type="text/plain; version=0.0.4; charset=utf-8",
            )

    def record_job_created(self, priority: int = None, submitted_by: str = None):
        """Record a job creation event."""
        if not self.jobs_created_counter:
            return

        attributes = {}
        if priority is not None:
            attributes["priority"] = str(priority)
        if submitted_by:
            attributes["submitted_by"] = submitted_by

        self.jobs_created_counter.add(1, attributes=attributes)

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

    def set_nats_connection_status(self, connected: bool):
        """Set NATS connection status."""
        # This should be an observable gauge in production
        # For now, we'll use up_down_counter
        pass

    def increment_sse_connections(self):
        """Increment active SSE connections."""
        if self.sse_connections_gauge:
            self.sse_connections_gauge.add(1)

    def decrement_sse_connections(self):
        """Decrement active SSE connections."""
        if self.sse_connections_gauge:
            self.sse_connections_gauge.add(-1)

    def record_request_duration(
        self,
        method: str,
        path: str,
        status_code: int,
        duration: float,
    ):
        """Record HTTP request duration."""
        if not self.request_duration_histogram:
            return

        self.request_duration_histogram.record(
            duration,
            attributes={
                "http.method": method,
                "http.route": path,
                "http.status_code": str(status_code),
            },
        )

    def create_timing_middleware(self) -> Callable:
        """
        Create middleware to track request timings.

        Returns:
            FastAPI middleware function
        """

        async def metrics_middleware(request: Request, call_next):
            start_time = time.time()

            # Process request
            response = await call_next(request)

            # Record metrics
            duration = time.time() - start_time
            self.record_request_duration(
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration=duration,
            )

            return response

        return metrics_middleware


# Global metrics manager instance
metrics_manager = MetricsManager()
