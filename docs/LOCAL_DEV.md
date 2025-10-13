# Local Development (macOS, no Docker)

## Prerequisites

- Homebrew: https://brew.sh

## Services

### Postgres 18

```
brew install postgresql@18
brew services start postgresql@18
createdb planet || true
psql -d planet -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"  # uses your macOS user auth (peer)
```

### NATS

```
brew install nats-server
nats-server -p 4222 -m 8222
```

Alternatively, use Make targets:

```
make up         # starts Postgres 18 (brew) + NATS
make down       # stops both
make logs       # shows statuses
```

## Database migrations

```
make db-upgrade                 # apply migrations (uses local unix socket auth)
make db-migrate msg="add table" # create new migration revision
```

## Next steps

- Implement API/worker/web run targets in Makefile when services are added.
