"""Health facility endpoints."""
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping

from app.database import get_db
from app.models import HealthFacility
from app.services.osm_service import OSMService

router = APIRouter(prefix="/api/facilities", tags=["Facilities"])
logger = logging.getLogger(__name__)

@router.get("/")
def get_facilities(db: Session = Depends(get_db)):
    """Get all health facilities."""
    return db.query(HealthFacility).all()

@router.get("/geojson")
def get_facilities_geojson(db: Session = Depends(get_db)):
    """Get health facilities as GeoJSON FeatureCollection."""
    facilities = db.query(HealthFacility).all()

    features = []
    for fac in facilities:
        # Try to use PostGIS location geometry first
        geometry = None
        if fac.location is not None:
            try:
                geometry = mapping(to_shape(fac.location))
            except Exception:
                logger.warning(
                    "Failed to convert facility location to GeoJSON; id=%s",
                    fac.id,
                    exc_info=True,
                )

        # Fall back to lat/lon if no PostGIS geometry
        if geometry is None:
            if fac.latitude is None or fac.longitude is None:
                continue
            geometry = {
                "type": "Point",
                "coordinates": [fac.longitude, fac.latitude]
            }

        features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "id": fac.id,
                "name": fac.name,
                "type": fac.type,
                "lga_id": fac.lga_id
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.post("/fetch-osm")
async def fetch_osm_data(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Trigger background fetch of health facilities from OpenStreetMap."""
    def task():
        # Re-instantiate session for background task
        from app.database import SessionLocal
        db_bg = SessionLocal()
        svc = OSMService(db_bg)
        try:
            svc.fetch_health_facilities()
            svc.assign_facilities_to_lgas()
        finally:
            db_bg.close()

    background_tasks.add_task(task)
    return {"message": "OSM fetch started in background"}
