# Planet Software Engineer Position

**Location**: Berlin, Germany (Hybrid - 3 days/week in office)

**Role**: Software Engineer, Full-Stack

**Application Deadline**: December 11, 2025

## About Planet

Planet designs, builds, and operates the largest constellation of imaging satellites in history. This constellation delivers an unprecedented dataset of empirical information via a revolutionary cloud-based platform to authoritative figures in commercial, environmental, and humanitarian sectors.

Planet controls every component of:
- Hardware design
- Manufacturing
- Data processing
- Software engineering

## The Role

Building clear, thoughtful experiences for customers to understand their accounts. The team is small and distributed across eastern North America and Berlin.

### Primary Responsibilities

- Adding new features to a newly-built ecosystem of apps
- Identifying, troubleshooting, and resolving technical issues related to customer reporting
- Reviewing code changes and iterating new features based on team feedback
- Developing tools and libraries and writing technical documentation to help other engineering teams integrate with customer telemetry
- Ensuring the accuracy and reliability of code through automated testing

## Requirements

### Must Have (4+ years experience)

- Software development experience
- React, Python, and/or Golang (primary languages)
- Relational databases
- Professional working proficiency in English
- Bachelor's degree in Computer Science or similar
- Experience in cross-functional teams that put customer requirements first
- Adaptable and open to mentorship
- CI/CD and source control tooling (GitHub, GitLab)

### Nice to Have

- Experience working collaboratively with product managers and designers
- Production React ecosystem (Redux Thunk, Emotion CSS)
- **OpenAPI and REST code generation** ⭐
- Iterative, agile development
- **Using spatial data and web mapping** ⭐
- **Writing backend APIs or event-driven data pipelines** ⭐

## How Constellation Aligns

### Technology Match

| Requirement | Constellation Implementation |
|-------------|------------------------------|
| React | ✅ Next.js 15 + React 19 + TanStack Query |
| Python | ✅ FastAPI + SQLAlchemy + Pydantic |
| Golang | 🔜 Usage service planned (chi + pgx) |
| Relational DB | ✅ PostgreSQL 18 with migrations |
| OpenAPI | ✅ OpenAPI-first with codegen workflow |
| Emotion CSS | ✅ Used for styling |
| Spatial Data | 🔜 PostGIS + deck.gl (Milestone 4) |
| Event Pipelines | ✅ NATS + WebSocket architecture |
| CI/CD | ✅ GitHub Actions with automated testing |

### Demonstrated Skills

**Full-Stack Development**
- Frontend: Modern React with server components, real-time updates
- Backend: RESTful API with OpenAPI specification
- Database: Schema design, migrations, query optimization

**Code Quality**
- 80%+ test coverage (backend)
- Unit tests + E2E tests (frontend)
- Type safety throughout (TypeScript + Pydantic)

**DevOps & Infrastructure**
- Kubernetes deployment on GKE
- CI/CD pipeline with staging/production environments
- Custom domain setup with SSL/TLS
- Infrastructure as code

**Customer-Focused Features**
- Job management (CRUD operations)
- Real-time telemetry (planned)
- Usage reporting (Go service planned)
- Intuitive UI with accessibility in mind

**Documentation**
- Comprehensive guides for setup, development, deployment
- OpenAPI specification for API
- Architecture documentation
- Inline code comments

## Key Differentiators

### 1. OpenAPI-First Approach

**Planet mentions**: "Experience with OpenAPI and REST code generation"

**Constellation delivers**:
- OpenAPI spec as single source of truth
- Automated TypeScript client generation
- Type safety from backend to frontend
- API docs auto-generated

See: [OpenAPI Workflow](old/OPENAPI_WORKFLOW.md)

### 2. Spatial Data (Satellite Domain)

**Planet mentions**: "Experience using spatial data and web mapping"

**Constellation demonstrates**:
- PostGIS integration planned
- Job footprints as GeoJSON
- Spatial queries (find jobs in area)
- Map visualization with deck.gl
- Satellite tile processing simulation

See: [Roadmap - Milestone 4](006_ROADMAP.md#milestone-4-spatial-features-planet-specific)

### 3. Event-Driven Architecture

**Planet mentions**: "Writing backend APIs or event-driven data pipelines"

**Constellation implements**:
- NATS for event streaming
- WebSocket for real-time updates
- Worker architecture for background processing
- Async patterns throughout

See: [Architecture](003_ARCHITECTURE.md#events--real-time)

### 4. Customer Telemetry

**Planet requirement**: "Customer telemetry integration"

**Constellation plans**:
- Go service for usage aggregation
- Account-level reporting
- Usage leaderboards
- Time-series metrics

See: [Roadmap - Milestone 5](006_ROADMAP.md#milestone-5-multi-tenancy--go-service)

### 5. Production-Grade Practices

- Comprehensive testing (unit + integration + E2E)
- CI/CD with staging/production environments
- Kubernetes deployment
- Observability planning (OpenTelemetry)
- Security best practices (secrets management, HTTPS)

## Team Fit

### Collaborative Mindset
- Documented architecture decisions
- Clear communication in documentation
- Openness to feedback and iteration

### Customer Requirements First
- Focused on user experience
- Thoughtful error handling
- Accessible UI components (Radix UI)

### Adaptable & Learning
- Learned multiple technologies for this project
- Applied Planet-specific considerations (satellite imagery)
- Willing to iterate based on requirements

## Application Strategy

### Highlight in Interview

1. **Technical Depth**: Walk through architecture and design decisions
2. **Domain Fit**: Explain spatial features and satellite imagery simulation
3. **Code Quality**: Demonstrate testing strategy and type safety
4. **Production Readiness**: Show deployment process and CI/CD

### Demo Plan

**Screencast** (2-3 minutes):
1. Submit a job via UI
2. Show real-time status updates (once Milestone 2 complete)
3. Display job on map (once Milestone 4 complete)
4. Query jobs by location
5. View usage dashboard

**Code Walkthrough**:
- OpenAPI workflow
- Real-time architecture
- Testing approach
- Kubernetes deployment

### Questions to Ask

1. What's the current state of the "newly-built ecosystem of apps"?
2. How does the team approach customer telemetry and reporting?
3. What's the balance between backend and frontend work?
4. How do you handle spatial data at scale?
5. What's the team's experience with OpenAPI codegen?

## Next Steps

To strengthen application for Planet:

1. **Complete Milestone 2** (Real-time + Workers)
   - Shows event-driven expertise
   - Demonstrates async patterns

2. **Add Spatial Features** (Milestone 4)
   - Direct alignment with Planet's domain
   - Shows understanding of satellite imagery

3. **Start Go Service** (Milestone 5)
   - Demonstrates Go proficiency
   - Shows multi-language capabilities

4. **Create Demo Video**
   - Visual demonstration of capabilities
   - Highlight Planet-specific features

5. **Write Case Study**
   - "Building a GPU Orchestration Platform"
   - Explain architecture decisions
   - Discuss trade-offs and learnings

## Resources

- Planet Website: https://planet.com
- Planet API Docs: https://developers.planet.com
- Planet Blog: https://planet.com/insights
- Job Posting: [Original source]

## Contact

**Constellation Project Repository**: [GitHub URL]

**Author**: Kemal Can

**Date**: October 2025

---

*This document tracks alignment between the Constellation project and Planet's Software Engineer position. It's a living document that updates as the project evolves.*
