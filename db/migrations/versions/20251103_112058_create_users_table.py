import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251103_112058_create_users_table"
down_revision = "20251020_150005_empty_migration_file"
branch_labels = None
depends_on = None


def upgrade():
    # Ensure pgcrypto is available for gen_random_uuid()
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.create_table(
        "users",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column(
            "role", sa.String(50), nullable=False, server_default=sa.text("'user'")
        ),
        sa.Column("current_hashed_refresh_token", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"])


def downgrade():
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
