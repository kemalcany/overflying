# Build stage for dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml and install dependencies
COPY pyproject.toml ./

# Extract and install dependencies from pyproject.toml
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    sqlalchemy>=2.0.0 \
    psycopg2-binary>=2.9.0 \
    pydantic>=2.0.0 \
    pydantic-settings>=2.0.0 \
    psutil>=5.9.0 \
    nats-py>=2.9.0 \
    aiohttp>=3.9.0 \
    opentelemetry-api>=1.27.0 \
    opentelemetry-sdk>=1.27.0 \
    opentelemetry-instrumentation>=0.48b0 \
    opentelemetry-instrumentation-sqlalchemy>=0.48b0 \
    opentelemetry-instrumentation-system-metrics>=0.48b0 \
    opentelemetry-exporter-prometheus>=0.48b0 \
    prometheus-client>=0.20.0

# Development stage (for testing)
FROM python:3.11-slim AS development

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY src ./src

# Install dev dependencies
RUN pip install --no-cache-dir pytest pytest-asyncio pytest-cov

CMD ["python", "-m", "pytest", "tests/", "-v"]

# Production runtime stage
FROM python:3.11-slim AS production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY src ./src

# Create non-root user
RUN useradd -m -u 1000 worker && \
    chown -R worker:worker /app
USER worker

# Run the worker as a module
CMD ["python", "-m", "src.main"]
