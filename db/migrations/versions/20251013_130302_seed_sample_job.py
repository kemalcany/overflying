
from alembic import op

# revision identifiers, used by Alembic.
revision = "20251013_130302_seed_sample_job"
down_revision = "20251013_115304_create_jobs_table"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
    DO $$
    BEGIN
      IF (SELECT COUNT(1) FROM jobs) = 0 THEN
        INSERT INTO jobs (name, params, priority, state, submitted_by)
        VALUES ('sample-job', '{}'::jsonb, 0, 'queued', 'system');
      END IF;
    END;
    $$;
    """)


def downgrade():
    op.execute("""
    DELETE FROM jobs WHERE name = 'sample-job' AND submitted_by = 'system';
    """)
