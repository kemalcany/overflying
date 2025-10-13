# Fresh Installation Guide (macOS, No Docker)

This guide walks you through setting up the Constellation project on a fresh macOS machine without using Docker.

## Prerequisites

1. **Homebrew** - https://brew.sh
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Python 3** (for database migrations)
   ```bash
   brew install python@3
   ```

## Step 1: Install PostgreSQL 18

```bash
brew install postgresql@18
brew services start postgresql@18
```

Verify it's running:
```bash
psql --version
# Should show: psql (PostgreSQL) 18.0 (Homebrew)
```

## Step 2: Create Database

```bash
createdb planet
```

Verify you can connect:
```bash
psql -d planet -c "SELECT version();"
```

## Step 3: Setup Python Virtual Environment

From the project root:

```bash
make venv
```

This creates a `.venv` folder and installs:
- Alembic (database migration tool)
- SQLAlchemy (database toolkit)
- psycopg2 (PostgreSQL driver)

**What is venv?** It's an isolated Python environment just for this project, so these tools don't interfere with your system Python or other projects.

## Step 4: Fix Alembic Version Table (One-time)

The first time only, you need to expand the Alembic version tracking table:

```bash
psql -d planet -c "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(64) PRIMARY KEY);"
```

This creates the tracking table with enough space for long version names.

## Step 5: Run Database Migrations

```bash
make db-upgrade
```

This will:
- Create the `jobs` table
- Add indexes
- Insert a sample job

## Step 6: Verify Everything Works

```bash
make db-query
```

You should see output like:
```
id                  | name       | params | priority | state  | created_at            | submitted_by
--------------------+------------+--------+----------+--------+-----------------------+--------------
<uuid>              | sample-job | {}     | 0        | queued | 2025-10-13 16:22:35...| system
```

## Step 7: Explore the Database (Optional)

Open an interactive PostgreSQL shell:
```bash
make db-shell
```

Inside the shell, try:
```sql
\dt                    -- List all tables
\d jobs                -- Describe the jobs table structure
SELECT * FROM jobs;    -- Query all jobs
\q                     -- Quit
```

## Useful Commands

- `make db-query` - Show all jobs in the database
- `make db-shell` - Open PostgreSQL interactive shell
- `make db-upgrade` - Apply new migrations
- `make db-downgrade` - Undo last migration
- `make help` - Show all available commands

## Troubleshooting

### "Connection refused" errors
Your connection string needs to use Unix sockets instead of TCP/IP. Check that [db/alembic.ini](db/alembic.ini) has:
```ini
sqlalchemy.url = postgresql+psycopg2://YOUR_USERNAME@/planet?host=/tmp
```
Replace `YOUR_USERNAME` with your macOS username (run `whoami` to find it).

### "relation does not exist" errors
You haven't run migrations yet. Run:
```bash
make db-upgrade
```

### "No such file or directory: .venv"
You need to create the virtual environment first:
```bash
make venv
```

## What's Next?

Now that the database is set up, you can:
1. Build the FastAPI backend (apps/api)
2. Build the worker service (apps/worker)
3. Build the React frontend (apps/web)

See [README.md](README.md) for the full project overview.
