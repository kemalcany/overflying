from __future__ import annotations

from alembic import context
from sqlalchemy import engine_from_config, pool

# This config object provides access to the values within the .ini file in use.
config = context.config

# If using metadata for autogenerate in the future, set target_metadata here.
target_metadata = None

# Point Alembic to the versions directory explicitly
context.configure(version_table_schema=None, version_locations=["db/migrations/versions"])  # versions path


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()


