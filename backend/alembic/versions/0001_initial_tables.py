"""Initial tables for jobs and validations

Revision ID: 0001_initial_tables
Revises: 
Create Date: 2026-09-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0001_initial_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass # op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        'jobs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=True),
        sa.Column('progress', sa.Float(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('input_file_path', sa.String(length=512), nullable=True),
        sa.Column('output_layers_json', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('explainable_breakdown_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jobs_id'), 'jobs', ['id'], unique=False)
    op.create_index(op.f('ix_jobs_status'), 'jobs', ['status'], unique=False)

    op.create_table(
        'validations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('job_id', sa.String(length=64), nullable=False),
        sa.Column('observation_source', sa.String(length=64), nullable=True),
        sa.Column('metrics_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_validations_job_id'), 'validations', ['job_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_validations_job_id'), table_name='validations')
    op.drop_table('validations')
    op.drop_index(op.f('ix_jobs_status'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_id'), table_name='jobs')
    op.drop_table('jobs')
