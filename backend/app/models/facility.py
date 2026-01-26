"""Health facility models."""
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base

class HealthFacility(Base):
    """Health facility (Hospital, Clinic, etc)."""
    __tablename__ = "health_facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String)  # hospital, clinic, health_post
    lga_id = Column(Integer, ForeignKey("lgas.id"))

    # Geolocation - keep lat/lon for convenience
    latitude = Column(Float)
    longitude = Column(Float)

    # PostGIS point geometry
    location = Column(Geometry('POINT', srid=4326), nullable=True)

    # Relationships
    lga = relationship("LGA", back_populates="facilities")
