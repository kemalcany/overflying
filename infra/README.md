# Infra

Local development is Docker-free. Use Homebrew services on macOS.

- Postgres 18: `brew install postgresql@18 && brew services start postgresql@18`
- NATS: `brew install nats-server && nats-server -p 4222 -m 8222`

The provided `docker-compose.yml` is intended for CI and optional preview environments only.
