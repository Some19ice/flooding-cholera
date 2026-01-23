"""LGA (Local Government Area) and Ward models."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class LGA(Base):
    """Local Government Area model with geographic boundaries."""

    __tablename__ = "lgas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False)
    population = Column(Integer, nullable=True)
    area_sq_km = Column(Float, nullable=True)
    headquarters = Column(String(100), nullable=True)

    # Store geometry as GeoJSON text for SQLite compatibility
    geometry_json = Column(Text, nullable=True)

    # Centroid for quick lookups
    centroid_lat = Column(Float, nullable=True)
    centroid_lon = Column(Float, nullable=True)

    # Vulnerability factors
    water_coverage_pct = Column(Float, default=50.0)  # % with safe water access
    sanitation_coverage_pct = Column(Float, default=50.0)  # % with sanitation
    health_facilities_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    wards = relationship("Ward", back_populates="lga", cascade="all, delete-orphan")
    case_reports = relationship("CaseReport", back_populates="lga", cascade="all, delete-orphan")
    environmental_data = relationship("EnvironmentalData", back_populates="lga", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="lga", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<LGA(id={self.id}, name={self.name})>"


class Ward(Base):
    """Ward model - subdivision of LGA."""

    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    lga_id = Column(Integer, ForeignKey("lgas.id"), nullable=False)
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(20), nullable=True)
    population = Column(Integer, nullable=True)

    # Store geometry as GeoJSON text for SQLite compatibility
    geometry_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lga = relationship("LGA", back_populates="wards")
    case_reports = relationship("CaseReport", back_populates="ward", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Ward(id={self.id}, name={self.name}, lga_id={self.lga_id})>"
