"""Health facility endpoints."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import HealthFacility
from app.services.osm_service import OSMService

router = APIRouter(prefix="/api/facilities", tags=["Facilities"])

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
        # Skip facilities with missing coordinates
        if fac.latitude is None or fac.longitude is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [fac.longitude, fac.latitude]
            },
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
