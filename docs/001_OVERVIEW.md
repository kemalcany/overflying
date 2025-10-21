# Project Overview

**Constellation** is a GPU task orchestration platform with real-time insights, built as a demonstration project for the Planet Software Engineer position.

## What is Constellation?

Constellation is a full-stack application that:
- Schedules and manages GPU-accelerated jobs
- Streams live telemetry to a React dashboard
- Exposes an OpenAPI-first REST API
- Provides real-time updates via WebSockets
- Includes usage aggregation and analytics capabilities

## Purpose

This project demonstrates:
- Full-stack development capabilities (React, Python, Go)
- Modern cloud-native architecture (Kubernetes, GCP)
- Real-time data streaming and event-driven systems
- Production-grade DevOps practices (CI/CD, testing, observability)
- Domain-specific expertise (satellite imagery processing simulation)

## Key Alignment with Planet

The tech stack and architecture directly align with Planet's requirements:

- React + Python + Go (exact match with job requirements)
- OpenAPI/REST code generation
- Complex data visualization with TanStack Query
- Event-driven pipelines (NATS + WebSocket)
- Spatial data handling (PostGIS + deck.gl)
- Customer telemetry and usage reporting

## Project Status

**Current Phase**: Milestone 1 - Core Infrastructure
- Database setup and migrations
- FastAPI backend with CRUD operations
- React frontend with real-time updates
- Kubernetes deployment on GKE
- CI/CD pipeline with GitHub Actions
- Custom domain setup with SSL/TLS

**Next Phases**: See [Roadmap](006_ROADMAP.md)

## Quick Links

- [Getting Started](002_GETTING_STARTED.md) - Installation and setup
- [Architecture](003_ARCHITECTURE.md) - System design and tech stack
- [Development](004_DEVELOPMENT.md) - Local development workflow
- [Deployment](005_DEPLOYMENT.md) - Production deployment guide
- [Roadmap](006_ROADMAP.md) - Future enhancements
- [Job Description](007_PLANET_JOB_DESCRIPTION.md) - Planet role details
