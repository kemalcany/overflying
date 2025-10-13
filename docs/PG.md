# Connect to PostgreSQL

psql -U $USER -d postgres

# Check version

psql --version

# Check service status

brew services list | grep postgres

# Restart service if needed

brew services restart postgresql@18
