# Getting Started

This guide walks you through setting up Constellation on your local machine.

## Prerequisites

### Required
- [Homebrew](https://brew.sh) (macOS)
- Python 3.11+
- Node.js 18+
- PostgreSQL 18

### Optional
- Docker (for containerized database)
- kubectl (for Kubernetes deployment)
- gcloud CLI (for GCP deployment)

## Quick Start (macOS)

### 1. Install Dependencies

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL 18
brew install postgresql@18
brew services start postgresql@18

# Install Python and Node.js (if needed)
brew install python@3.11 node
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/planet.git
cd planet
```

### 3. Setup Database

#### Option A: Local PostgreSQL (Recommended for macOS)

```bash
# Create database
createdb planet

# Create virtual environment and install dependencies
make venv

# Run migrations
make db-upgrade

# Verify setup
make db-query
```

#### Option B: Docker PostgreSQL

```bash
# Start PostgreSQL container
cd db
docker compose up -d

# Run migrations
make db-upgrade
```

### 4. Setup API Service

```bash
cd apps/api

# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Start API server
uvicorn src.main:app --reload

# API will be available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 5. Setup Web App

```bash
cd apps/web

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Web app will be available at http://localhost:3000
```

## Verify Installation

### Test API

```bash
# Health check
curl http://localhost:8000/health

# Create a job
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{"name": "test-job", "priority": 10}'

# List jobs
curl http://localhost:8000/jobs
```

### Test Web App

1. Open http://localhost:3000
2. You should see the jobs dashboard
3. Try creating a new job using the UI

## Common Issues

### Database Connection Errors

If you see "connection refused" errors:

**For local PostgreSQL:**
```bash
# Check if PostgreSQL is running
brew services list | grep postgres

# Restart if needed
brew services restart postgresql@18

# Verify you can connect
psql -d planet -c "SELECT version();"
```

**For Docker PostgreSQL:**
```bash
# Check if container is running
docker ps | grep postgres

# Restart if needed
cd db && docker compose restart
```

### Port Already in Use

If port 8000 or 3000 is already in use:

```bash
# Find and kill process using port 8000
lsof -ti:8000 | xargs kill -9

# Or use a different port
uvicorn src.main:app --port 8001
```

### Migration Errors

If migrations fail:

```bash
# Reset database (WARNING: deletes all data)
make db-downgrade
make db-upgrade

# Or create fresh database
dropdb planet
createdb planet
make db-upgrade
```

## Next Steps

- [Development Workflow](004_DEVELOPMENT.md) - Learn the development process
- [Architecture](003_ARCHITECTURE.md) - Understand the system design
- [API Documentation](http://localhost:8000/docs) - Explore the API endpoints
- [Testing Guide](004_DEVELOPMENT.md#testing) - Run and write tests

## Quick Commands Reference

```bash
# Database
make venv              # Create Python virtual environment
make db-upgrade        # Run migrations
make db-downgrade      # Rollback last migration
make db-query          # Show all jobs
make db-shell          # Open PostgreSQL shell

# API
cd apps/api
pytest                 # Run tests
pytest --cov           # Run tests with coverage
uvicorn src.main:app --reload  # Start dev server

# Web
cd apps/web
npm test               # Run unit tests
npm run test:e2e       # Run E2E tests
npm run dev            # Start dev server
npm run build          # Build for production

# All services
make dev               # Start all services (if configured)
make test              # Run all tests (if configured)
```

## Troubleshooting

For detailed troubleshooting, see:
- [Database Setup Guide](old/SETUP.md)
- [Local Development Guide](old/LOCAL_DEV.md)
- [PostgreSQL Reference](old/PG.md)
