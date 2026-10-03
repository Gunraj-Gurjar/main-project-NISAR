"""Add provenance_json to jobs

Revision ID: 0002_job_provenance
Revises: 0001_initial_tables
Create Date: 2026-09-29 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0002_job_provenance"
down_revision = "0001_initial_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("provenance_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "provenance_json")
