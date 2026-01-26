"""Drop geometry_json columns after migration

Revision ID: 004
Revises: 003_migrate_geometry_data
Create Date: 2024-01-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_drop_geometry_json'
down_revision: Union[str, None] = '003_migrate_geometry_data'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the legacy geometry_json columns now that data is migrated to PostGIS
    op.drop_column('lgas', 'geometry_json')
    op.drop_column('wards', 'geometry_json')


def downgrade() -> None:
    # Re-add geometry_json columns
    op.add_column('lgas', sa.Column('geometry_json', sa.Text(), nullable=True))
    op.add_column('wards', sa.Column('geometry_json', sa.Text(), nullable=True))

    # Restore data from PostGIS geometry back to JSON
    op.execute("""
        UPDATE lgas
        SET geometry_json = ST_AsGeoJSON(geometry)
        WHERE geometry IS NOT NULL
    """)

    op.execute("""
        UPDATE wards
        SET geometry_json = ST_AsGeoJSON(geometry)
        WHERE geometry IS NOT NULL
    """)
