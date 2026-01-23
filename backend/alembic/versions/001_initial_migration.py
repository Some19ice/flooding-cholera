"""Initial migration - create all tables

Revision ID: 001
Revises:
Create Date: 2024-01-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create LGAs table
    op.create_table(
        'lgas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('population', sa.Integer(), nullable=True),
        sa.Column('area_sq_km', sa.Float(), nullable=True),
        sa.Column('headquarters', sa.String(length=100), nullable=True),
        sa.Column('geometry_json', sa.Text(), nullable=True),
        sa.Column('centroid_lat', sa.Float(), nullable=True),
        sa.Column('centroid_lon', sa.Float(), nullable=True),
        sa.Column('water_coverage_pct', sa.Float(), nullable=True, default=50.0),
        sa.Column('sanitation_coverage_pct', sa.Float(), nullable=True, default=50.0),
        sa.Column('health_facilities_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lgas_id'), 'lgas', ['id'], unique=False)
    op.create_index(op.f('ix_lgas_name'), 'lgas', ['name'], unique=True)

    # Create Wards table
    op.create_table(
        'wards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lga_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=True),
        sa.Column('population', sa.Integer(), nullable=True),
        sa.Column('geometry_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['lga_id'], ['lgas.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wards_id'), 'wards', ['id'], unique=False)
    op.create_index(op.f('ix_wards_name'), 'wards', ['name'], unique=False)

    # Create Case Reports table
    op.create_table(
        'case_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lga_id', sa.Integer(), nullable=False),
        sa.Column('ward_id', sa.Integer(), nullable=True),
        sa.Column('report_date', sa.Date(), nullable=False),
        sa.Column('epi_week', sa.Integer(), nullable=True),
        sa.Column('epi_year', sa.Integer(), nullable=True),
        sa.Column('new_cases', sa.Integer(), nullable=True, default=0),
        sa.Column('suspected_cases', sa.Integer(), nullable=True, default=0),
        sa.Column('confirmed_cases', sa.Integer(), nullable=True, default=0),
        sa.Column('deaths', sa.Integer(), nullable=True, default=0),
        sa.Column('recoveries', sa.Integer(), nullable=True, default=0),
        sa.Column('cases_under_5', sa.Integer(), nullable=True, default=0),
        sa.Column('cases_5_to_14', sa.Integer(), nullable=True, default=0),
        sa.Column('cases_15_plus', sa.Integer(), nullable=True, default=0),
        sa.Column('cases_male', sa.Integer(), nullable=True, default=0),
        sa.Column('cases_female', sa.Integer(), nullable=True, default=0),
        sa.Column('cfr', sa.Float(), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.Column('source_file', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['lga_id'], ['lgas.id'], ),
        sa.ForeignKeyConstraint(['ward_id'], ['wards.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_reports_id'), 'case_reports', ['id'], unique=False)
    op.create_index(op.f('ix_case_reports_report_date'), 'case_reports', ['report_date'], unique=False)

    # Create Environmental Data table
    op.create_table(
        'environmental_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lga_id', sa.Integer(), nullable=False),
        sa.Column('observation_date', sa.Date(), nullable=False),
        sa.Column('rainfall_mm', sa.Float(), nullable=True),
        sa.Column('rainfall_7day_mm', sa.Float(), nullable=True),
        sa.Column('rainfall_30day_mm', sa.Float(), nullable=True),
        sa.Column('ndwi', sa.Float(), nullable=True),
        sa.Column('flood_extent_pct', sa.Float(), nullable=True),
        sa.Column('flood_observed', sa.Boolean(), nullable=True, default=False),
        sa.Column('lst_day', sa.Float(), nullable=True),
        sa.Column('lst_night', sa.Float(), nullable=True),
        sa.Column('ndvi', sa.Float(), nullable=True),
        sa.Column('cloud_cover_pct', sa.Float(), nullable=True),
        sa.Column('data_source', sa.String(length=50), nullable=True),
        sa.Column('data_quality', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['lga_id'], ['lgas.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_environmental_data_id'), 'environmental_data', ['id'], unique=False)
    op.create_index(op.f('ix_environmental_data_observation_date'), 'environmental_data', ['observation_date'], unique=False)

    # Create Risk Scores table
    op.create_table(
        'risk_scores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lga_id', sa.Integer(), nullable=False),
        sa.Column('score_date', sa.Date(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('level', sa.String(length=20), nullable=False),
        sa.Column('flood_score', sa.Float(), nullable=True),
        sa.Column('rainfall_score', sa.Float(), nullable=True),
        sa.Column('case_score', sa.Float(), nullable=True),
        sa.Column('vulnerability_score', sa.Float(), nullable=True),
        sa.Column('rainfall_mm', sa.Float(), nullable=True),
        sa.Column('ndwi', sa.Float(), nullable=True),
        sa.Column('recent_cases', sa.Integer(), nullable=True),
        sa.Column('recent_deaths', sa.Integer(), nullable=True),
        sa.Column('algorithm_version', sa.String(length=20), nullable=True),
        sa.Column('calculated_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['lga_id'], ['lgas.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_risk_scores_id'), 'risk_scores', ['id'], unique=False)
    op.create_index(op.f('ix_risk_scores_score_date'), 'risk_scores', ['score_date'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_risk_scores_score_date'), table_name='risk_scores')
    op.drop_index(op.f('ix_risk_scores_id'), table_name='risk_scores')
    op.drop_table('risk_scores')

    op.drop_index(op.f('ix_environmental_data_observation_date'), table_name='environmental_data')
    op.drop_index(op.f('ix_environmental_data_id'), table_name='environmental_data')
    op.drop_table('environmental_data')

    op.drop_index(op.f('ix_case_reports_report_date'), table_name='case_reports')
    op.drop_index(op.f('ix_case_reports_id'), table_name='case_reports')
    op.drop_table('case_reports')

    op.drop_index(op.f('ix_wards_name'), table_name='wards')
    op.drop_index(op.f('ix_wards_id'), table_name='wards')
    op.drop_table('wards')

    op.drop_index(op.f('ix_lgas_name'), table_name='lgas')
    op.drop_index(op.f('ix_lgas_id'), table_name='lgas')
    op.drop_table('lgas')
