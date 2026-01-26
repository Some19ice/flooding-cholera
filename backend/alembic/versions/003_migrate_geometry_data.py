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
    # Migrate LGA geometries from JSON text to PostGIS geometry
    # ST_GeomFromGeoJSON parses GeoJSON and creates geometry
    # ST_Multi ensures we always get a MULTIPOLYGON
    op.execute("""
        UPDATE lgas
        SET geometry = ST_Multi(ST_GeomFromGeoJSON(geometry_json))
        WHERE geometry_json IS NOT NULL AND geometry IS NULL
    """)

    # Migrate Ward geometries from JSON text to PostGIS geometry
    op.execute("""
        UPDATE wards
        SET geometry = ST_Multi(ST_GeomFromGeoJSON(geometry_json))
        WHERE geometry_json IS NOT NULL AND geometry IS NULL
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
