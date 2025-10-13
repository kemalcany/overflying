
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251013_115304_create_jobs_table"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Ensure pgcrypto is available for gen_random_uuid()
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.create_table(
        "jobs",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("params", sa.dialects.postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("priority", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("state", sa.Text(), nullable=False, server_default=sa.text("'queued'")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("submitted_by", sa.Text(), nullable=True),
    )
    op.create_index("ix_jobs_state", "jobs", ["state"])
    op.create_index("ix_jobs_created_at", "jobs", ["created_at"])


def downgrade():
    op.drop_index("ix_jobs_created_at", table_name="jobs")
    op.drop_index("ix_jobs_state", table_name="jobs")
    op.drop_table("jobs")
