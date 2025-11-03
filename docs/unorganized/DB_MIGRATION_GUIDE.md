# Database Migration Guide

Quick reference for common database migration operations.

## Prerequisites

```bash
# Create Python virtual environment (one-time setup)
make venv
source .venv/bin/activate
```

## Local Development

```bash
# Initialize database
make db-init

# Create a new migration
make db-migrate msg="description of changes"

# Apply migrations
make db-upgrade

# Revert last migration
make db-downgrade

# Stamp database to specific revision (useful for fixing version mismatches)
make db-stamp rev="revision_id"
```

## Staging Environment

```bash
# Start Cloud SQL Proxy (in a separate terminal)
make db-staging-proxy

# In another terminal, apply migrations to staging
make db-upgrade ENV=staging

# Stamp staging database (if needed)
make db-stamp rev="revision_id" ENV=staging
```

## Production Environment

```bash
# Start Cloud SQL Proxy (in a separate terminal)
make db-prod-proxy

# In another terminal, apply migrations to production
make db-upgrade ENV=production

# Stamp production database (if needed)
make db-stamp rev="revision_id" ENV=production
```

## Environment Configuration

The database connection is controlled by environment files:
- **Local**: `.env.development` - Uses Docker Postgres on `localhost:5432`
- **Staging**: `.env.staging` - Uses Cloud SQL via proxy on `localhost:5433`
- **Production**: `.env.production` - Uses Cloud SQL via proxy on `localhost:5434`

Each environment file contains:
- `DATABASE_URL` - Used by API/Worker services
- `MIGRATION_DATABASE_URL` - Used by Alembic migrations (prefers proxy connections)

## Common Issues

### "Can't locate revision"
The database's alembic_version doesn't match your migration files. Use `db-stamp` to fix:
```bash
make db-stamp rev="20251020_150005_empty_migration_file" ENV=staging
```

### Connection timeout to Cloud SQL
Make sure Cloud SQL Proxy is running before applying migrations:
```bash
# Terminal 1
make db-staging-proxy

# Terminal 2
make db-upgrade ENV=staging
```

### Wrong database instance
Verify you're connected to the correct database:
```bash
# Check current alembic version
source .env.staging && psql $MIGRATION_DATABASE_URL -c "SELECT * FROM alembic_version;"
```

### Revision ID doesn't match filename
If a migration file has a revision ID that doesn't match the filename (e.g., random hash like `35a63d322f09`):

1. Edit the migration file to change the revision to match the filename
2. Update the database's alembic_version table:
```bash
# Replace OLD_REV with the current revision in DB, NEW_REV with the filename-based revision
psql <database_url> -c "UPDATE alembic_version SET version_num = 'NEW_REV' WHERE version_num = 'OLD_REV';"
```

Example:
```bash
psql postgresql://postgres:postgres@localhost:5432/planet -c "UPDATE alembic_version SET version_num = '20251103_133844_seed_default_users' WHERE version_num = '35a63d322f09';"
```

## Migration File Naming

Migrations use date-based naming for both filename and revision ID: `YYYYMMDD_HHMMSS_description`

Example:
- Filename: `20251103_112058_create_users_table.py`
- Revision ID: `"20251103_112058_create_users_table"`

The Makefile automatically generates matching revision IDs using the `--rev-id` flag.

## Useful Commands

```bash
# Check current migration version
source .env.development && alembic -c db/alembic.ini current

# View migration history
source .env.development && alembic -c db/alembic.ini history

# Show all available targets
make help
```
