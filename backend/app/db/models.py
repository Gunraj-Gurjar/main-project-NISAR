from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class JobRecord(Base):
    __tablename__ = "screening_jobs"

    id = Column(String(64), primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    status = Column(String(32), default="pending", index=True)
    error_message = Column(Text, nullable=True)

    input_file_path = Column(String(512), nullable=True)
    cog_path = Column(String(512), nullable=True)

    # Serialized JSON metadata
    provenance_json = Column(Text, nullable=True)
    explainable_breakdown_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    validations = relationship("ValidationRecord", back_populates="job", cascade="all, delete-orphan")
    advisories = relationship("AdvisoryRecord", back_populates="job", cascade="all, delete-orphan")


class ValidationRecord(Base):
    __tablename__ = "sar_validations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(64), ForeignKey("screening_jobs.id"), nullable=False, index=True)
    observation_source = Column(String(64), default="Sentinel-1")
    acquisition_date = Column(String(64), nullable=True)
    metrics_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("JobRecord", back_populates="validations")


class AdvisoryRecord(Base):
    __tablename__ = "screening_advisories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(64), ForeignKey("screening_jobs.id"), nullable=False, index=True)
    advisory_level = Column(String(64), nullable=False)
    rainfall_24h_mm = Column(Float, nullable=True)
    rainfall_context = Column(Text, nullable=True)
    official_disclaimer = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("JobRecord", back_populates="advisories")
