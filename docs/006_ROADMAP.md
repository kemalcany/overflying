# Roadmap

Future enhancements and milestones for Constellation.

## Current Status: Milestone 1 ✅

**Core Infrastructure Complete**

- ✅ PostgreSQL 18 database with migrations
- ✅ FastAPI backend with CRUD operations
- ✅ React frontend with TanStack Query
- ✅ Comprehensive test coverage (backend + frontend)
- ✅ Kubernetes deployment on GKE
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Custom domains with SSL/TLS
- ✅ OpenAPI specification and type generation

## Milestone 2: Real-Time & Workers

**Target**: Complete job lifecycle with real-time updates

### Backend
- [ ] Worker service implementation
  - [ ] GPU discovery with NVML (or simulation)
  - [ ] Job picker with `SELECT ... FOR UPDATE SKIP LOCKED`
  - [ ] Demo workload (satellite tile processing simulation)
  - [ ] Retry logic and error handling
- [ ] WebSocket endpoint for real-time updates
  - [ ] Job state changes
  - [ ] Live log streaming
  - [ ] GPU metrics broadcasting
- [ ] NATS integration
  - [ ] Event publishing from worker
  - [ ] Event consumption in API
  - [ ] WebSocket relay

### Frontend
- [ ] WebSocket client integration
  - [ ] Auto-reconnect logic
  - [ ] Fallback to polling
- [ ] Real-time job status updates
- [ ] Live log streaming component
- [ ] GPU metrics dashboard

### Infrastructure
- [ ] NATS deployment to Kubernetes
- [ ] Worker deployment to Kubernetes
- [ ] Horizontal pod autoscaling

### Testing
- [ ] Worker unit tests
- [ ] WebSocket E2E tests
- [ ] Load testing with k6

**Estimated Duration**: 2 weeks

## Milestone 3: Observability & Polish

**Target**: Production-ready monitoring and user experience

### Observability
- [ ] OpenTelemetry integration
  - [ ] Traces across services (UI → API → Worker → DB)
  - [ ] Metrics collection
  - [ ] Correlation IDs
- [ ] Prometheus + Grafana
  - [ ] System metrics (CPU, memory, requests)
  - [ ] Business metrics (job duration, queue depth)
  - [ ] Custom dashboards
- [ ] Structured logging
  - [ ] JSON format
  - [ ] Log aggregation (Cloud Logging or ELK)
- [ ] Error tracking
  - [ ] Sentry integration
  - [ ] Error alerting

### User Experience
- [ ] Job filtering and search
- [ ] Pagination for job list
- [ ] Bulk operations (delete multiple)
- [ ] Job templates/favorites
- [ ] User preferences

### Documentation
- [ ] API documentation improvements
- [ ] Architecture diagrams (updated)
- [ ] Screencast demo video
- [ ] Deployment runbook

### Performance
- [ ] Database query optimization
- [ ] Caching layer (Redis)
- [ ] Frontend bundle optimization
- [ ] Image optimization

**Estimated Duration**: 2 weeks

## Milestone 4: Spatial Features (Planet-Specific)

**Target**: Demonstrate satellite imagery domain expertise

### Backend
- [ ] PostGIS setup
  - [ ] Enable PostGIS extension
  - [ ] Add spatial columns to jobs table
- [ ] Spatial API endpoints
  - [ ] Store job tile footprints (GeoJSON)
  - [ ] Spatial queries (find jobs in area)
  - [ ] Bounding box queries
- [ ] Demo workload enhancement
  - [ ] Simulate satellite tile processing
  - [ ] Store tile coordinates
  - [ ] Generate sample imagery results

### Frontend
- [ ] Map integration (deck.gl or MapLibre)
  - [ ] Base map layer
  - [ ] Job footprint overlay
  - [ ] Click-through to job details
- [ ] Spatial filtering
  - [ ] Draw area of interest
  - [ ] Filter jobs by location
  - [ ] Visualize processed coverage

### Data
- [ ] Sample satellite tile dataset
- [ ] Realistic tile coordinate generation
- [ ] Coverage visualization

**Estimated Duration**: 1-2 weeks

## Milestone 5: Multi-Tenancy & Go Service

**Target**: Customer usage reporting and account management

### Go Usage Service
- [ ] Service implementation
  - [ ] chi router setup
  - [ ] pgx database driver
  - [ ] OpenTelemetry integration
- [ ] Usage aggregation
  - [ ] Aggregate by account/user
  - [ ] Time-series queries
  - [ ] Leaderboard generation
- [ ] API endpoints
  - [ ] `GET /usage/accounts/{id}`
  - [ ] `GET /usage/leaderboard`
  - [ ] `GET /usage/summary`

### Multi-Tenancy
- [ ] User authentication (JWT)
- [ ] Account/organization model
- [ ] Row-level security
  - [ ] Users see only their jobs
  - [ ] Admin role for full access
- [ ] Account quotas
  - [ ] Job limits per account
  - [ ] Rate limiting

### Frontend
- [ ] Login/authentication UI
- [ ] Account dashboard
- [ ] Usage graphs and charts
- [ ] Team management (if applicable)

**Estimated Duration**: 2-3 weeks

## Future Enhancements

### Analytics Layer (DuckDB)
- [ ] ETL pipeline (PostgreSQL → Parquet)
- [ ] DuckDB analytics queries
- [ ] BI-style dashboards
- [ ] Historical trend analysis

### Advanced Features
- [ ] Job scheduling (cron-like)
- [ ] Job dependencies (DAG)
- [ ] Job parameters templating
- [ ] Notification system (email, Slack)
- [ ] API rate limiting
- [ ] API versioning (v2)

### Developer Experience
- [ ] Docker Compose for full local stack
- [ ] Makefile commands (`make dev`, `make test`, `make demo`)
- [ ] Development containers (devcontainers)
- [ ] Automated database seeding

### Infrastructure
- [ ] Multi-region deployment
- [ ] Database read replicas
- [ ] CDN for frontend assets
- [ ] Auto-scaling policies

## Timeline

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Milestone 1    │  Milestone 2    │  Milestone 3    │  Milestone 4    │
│  (Complete)     │  (2 weeks)      │  (2 weeks)      │  (1-2 weeks)    │
│                 │                 │                 │                 │
│  Foundation     │  Real-Time      │  Observability  │  Spatial        │
│  Database       │  Workers        │  Monitoring     │  Features       │
│  API + CRUD     │  WebSocket      │  OpenTelemetry  │  PostGIS        │
│  Frontend       │  NATS           │  Grafana        │  Map UI         │
│  Testing        │  GPU Jobs       │  Polish         │  Tile Demo      │
│  Deployment     │                 │                 │                 │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
          │                 │                 │                 │
          └─────────────────┴─────────────────┴─────────────────┘
                    Total: ~6-8 weeks for Milestones 2-4
```

## Success Metrics

### Technical
- ✅ 80%+ test coverage
- [ ] <200ms average API response time
- [ ] <1s WebSocket message latency
- [ ] 99.9% uptime (production)
- [ ] Zero critical security vulnerabilities

### Functional
- ✅ Complete CRUD operations
- [ ] Real-time job updates
- [ ] Live log streaming
- [ ] GPU task execution
- [ ] Spatial queries working

### User Experience
- ✅ Intuitive UI
- [ ] <2s page load time
- [ ] Responsive on mobile
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Helpful error messages

## Decision Points

### After Milestone 2
**Decision**: Continue with Milestone 3 or pivot to spatial features?
- If demo for Planet interview: prioritize Milestone 4 (spatial)
- If continuing development: proceed with Milestone 3 (observability)

### Database Scaling
**Decision**: When to add read replicas?
- Monitor: Read query latency and DB CPU usage
- Trigger: >70% CPU or >100ms read latency
- Action: Add read replica for reports/analytics

### Caching Layer
**Decision**: When to add Redis?
- Monitor: API response times, database query counts
- Trigger: >500ms average response time
- Action: Add Redis for frequently accessed data

## Notes

### Why This Order?

1. **Milestone 1 (Foundation)**: Must have working system before adding complexity
2. **Milestone 2 (Real-Time)**: Core differentiator, highest impact feature
3. **Milestone 3 (Observability)**: Needed before production scale
4. **Milestone 4 (Spatial)**: Planet-specific, demonstrates domain expertise

### Flexibility

This roadmap is adaptable:
- Milestones can be reordered based on priorities
- Features can be moved between milestones
- Timeline estimates may adjust based on complexity

### Planet Interview Focus

For Planet application, prioritize:
1. ✅ Solid foundation (Milestone 1) - **DONE**
2. Real-time updates (Milestone 2) - **HIGH PRIORITY**
3. Spatial features (Milestone 4) - **SHOWS DOMAIN FIT**
4. Usage service (Milestone 5, Go part) - **SHOWS GO SKILLS**

Optional for demo:
- Full observability stack (can use simplified version)
- Multi-tenancy (can show architecture understanding)

## Contributing

When implementing features:
1. Create feature branch
2. Write tests first (TDD)
3. Implement feature
4. Update documentation
5. Create pull request

See [Development Workflow](004_DEVELOPMENT.md) for details.

## Questions?

- Architecture decisions: See [Architecture](003_ARCHITECTURE.md)
- Implementation details: See [Development](004_DEVELOPMENT.md)
- Deployment: See [Deployment](005_DEPLOYMENT.md)
