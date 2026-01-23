"""Cholera case report model."""
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class CaseStatus(str, enum.Enum):
    """Status of cholera case."""
    SUSPECTED = "suspected"
    CONFIRMED = "confirmed"
    RECOVERED = "recovered"
    DECEASED = "deceased"


class DataSource(str, enum.Enum):
    """Source of case data."""
    HOSPITAL = "hospital"
    COMMUNITY = "community"
    SURVEILLANCE = "surveillance"
    UPLOADED = "uploaded"


class CaseReport(Base):
    """Cholera case report model."""

    __tablename__ = "case_reports"

    id = Column(Integer, primary_key=True, index=True)
    lga_id = Column(Integer, ForeignKey("lgas.id"), nullable=False, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)

    # Case date (epidemiological week can be derived)
    report_date = Column(Date, nullable=False, index=True)
    epi_week = Column(Integer, nullable=True)  # 1-52
    epi_year = Column(Integer, nullable=True)

    # Case counts
    new_cases = Column(Integer, default=0)
    suspected_cases = Column(Integer, default=0)
    confirmed_cases = Column(Integer, default=0)
    deaths = Column(Integer, default=0)
    recoveries = Column(Integer, default=0)

    # Demographics (aggregated)
    cases_under_5 = Column(Integer, default=0)
    cases_5_to_14 = Column(Integer, default=0)
    cases_15_plus = Column(Integer, default=0)
    cases_male = Column(Integer, default=0)
    cases_female = Column(Integer, default=0)

    # Case fatality rate (calculated)
    cfr = Column(Float, nullable=True)

    # Data source tracking
    source = Column(String(50), default=DataSource.UPLOADED)
    source_file = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lga = relationship("LGA", back_populates="case_reports")
    ward = relationship("Ward", back_populates="case_reports")

    def __repr__(self):
        return f"<CaseReport(id={self.id}, lga_id={self.lga_id}, date={self.report_date}, cases={self.new_cases})>"

    @property
    def calculated_cfr(self) -> float:
        """Calculate case fatality rate."""
        total_cases = self.new_cases or (self.suspected_cases + self.confirmed_cases)
        if total_cases > 0:
            return (self.deaths / total_cases) * 100
        return 0.0
