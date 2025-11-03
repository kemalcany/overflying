from alembic import op

# revision identifiers, used by Alembic.
revision = "20251103_133844_seed_default_users"
down_revision = "20251103_112058_create_users_table"
branch_labels = None
depends_on = None


def upgrade():
    # Insert two default users with bcrypt-hashed passwords (password: "123")
    op.execute("""
        INSERT INTO users (email, password_hash, name, role)
        VALUES
            ('user@planet.com', '$2b$12$O02gPV0CLdrM9aOCWVHMV.cmZiKrRCLvMd2fZuUglHr0xkx4MQLnq', 'Planet User', 'user'),
            ('hello@kemalyalcinkaya.co.uk', '$2b$12$KP5qZxG2RVrwunc.57g6d.cN8oKJc3di4nYfqlE9PXnoBhS2UDN6G', 'Kemal Yalcinkaya', 'admin')
        ON CONFLICT (email) DO NOTHING;
    """)


def downgrade():
    # Remove the default users
    op.execute("""
        DELETE FROM users WHERE email IN ('user@planet.com', 'hello@kemalyalcinkaya.co.uk');
    """)
