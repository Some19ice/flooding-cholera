"""Migrate geometry data from JSON to PostGIS

Revision ID: 003
Revises: 002_add_postgis
Create Date: 2024-01-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_migrate_geometry_data'
down_revision: Union[str, None] = '002_add_postgis'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != 'postgresql':
        return

    # Migrate LGA geometries from JSON text to PostGIS geometry
    # ST_GeomFromGeoJSON parses GeoJSON and creates geometry
    # ST_Multi ensures we always get a MULTIPOLYGON
    # ST_SetSRID ensures coordinate system is 4326
    # Added guards for valid JSON and correct geometry types
    op.execute("""
        UPDATE lgas
        SET geometry = ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON(geometry_json)), 4326)
        WHERE geometry_json IS NOT NULL 
          AND geometry_json <> '' 
          AND geometry IS NULL
          AND (geometry_json::jsonb->>'type') IN ('Polygon', 'MultiPolygon')
    """)

    # Migrate Ward geometries from JSON text to PostGIS geometry
    op.execute("""
        UPDATE wards
        SET geometry = ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON(geometry_json)), 4326)
        WHERE geometry_json IS NOT NULL 
          AND geometry_json <> '' 
          AND geometry IS NULL
          AND (geometry_json::jsonb->>'type') IN ('Polygon', 'MultiPolygon')
    """)

    # Migrate facility points from lat/lon to PostGIS Point geometry
    op.execute("""
        UPDATE health_facilities
        SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL
    """)


def downgrade() -> None:
    # Clear the PostGIS geometry columns (data can be regenerated from JSON/lat-lon)
    op.execute("UPDATE lgas SET geometry = NULL")
    op.execute("UPDATE wards SET geometry = NULL")
    op.execute("UPDATE health_facilities SET location = NULL")
