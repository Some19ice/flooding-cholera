"""Add PostGIS geometry columns

Revision ID: 002
Revises: 001_initial
Create Date: 2024-01-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


# revision identifiers, used by Alembic.
revision: str = '002_add_postgis'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable PostGIS extension
    """
    Enable PostGIS and apply spatial schema changes: create the health_facilities table, add geometry columns to lgas and wards, and create spatial indexes.
    
    Creates the PostGIS extension if missing, adds a new health_facilities table (columns: id, name, type, lga_id, latitude, longitude, location as POINT with SRID 4326) with a foreign key to lgas.id and indexes on id and name, adds a MULTIPOLYGON geometry column (SRID 4326) to lgas and wards, and creates GiST spatial indexes for lgas.geometry, wards.geometry, and health_facilities.location.
    """
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')

    # Create health_facilities table (was missing from initial migration)
    op.create_table(
        'health_facilities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('lga_id', sa.Integer(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('location', Geometry('POINT', srid=4326), nullable=True),
        sa.ForeignKeyConstraint(['lga_id'], ['lgas.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_health_facilities_id'), 'health_facilities', ['id'], unique=False)
    op.create_index(op.f('ix_health_facilities_name'), 'health_facilities', ['name'], unique=False)

    # Add geometry columns to lgas table
    op.add_column('lgas', sa.Column('geometry', Geometry('MULTIPOLYGON', srid=4326), nullable=True))

    # Add geometry columns to wards table
    op.add_column('wards', sa.Column('geometry', Geometry('MULTIPOLYGON', srid=4326), nullable=True))

    # Create spatial indexes for efficient querying
    op.execute('CREATE INDEX IF NOT EXISTS idx_lgas_geometry ON lgas USING GIST (geometry)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_wards_geometry ON wards USING GIST (geometry)')
    op.execute('CREATE INDEX IF NOT EXISTS idx_facilities_location ON health_facilities USING GIST (location)')


def downgrade() -> None:
    # Drop spatial indexes
    """
    Revert the PostGIS schema changes applied in the matching upgrade revision.
    
    Drops spatial indexes created for facility locations, wards, and lgas; removes the `geometry` columns from `wards` and `lgas`; and drops the `health_facilities` table along with its indexes.
    """
    op.execute('DROP INDEX IF EXISTS idx_facilities_location')
    op.execute('DROP INDEX IF EXISTS idx_wards_geometry')
    op.execute('DROP INDEX IF EXISTS idx_lgas_geometry')

    # Drop geometry columns
    op.drop_column('wards', 'geometry')
    op.drop_column('lgas', 'geometry')

    # Drop health_facilities table
    op.drop_index(op.f('ix_health_facilities_name'), table_name='health_facilities')
    op.drop_index(op.f('ix_health_facilities_id'), table_name='health_facilities')
    op.drop_table('health_facilities')