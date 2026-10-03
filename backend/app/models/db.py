from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class JobModel(Base):
    __tablename__ = "jobs"

    id = Column(String(64), primary_key=True, index=True)
    status = Column(String(32), default="queued", index=True)
    progress = Column(Float, default=0.0)
    error = Column(Text, nullable=True)

    original_filename = Column(String(255), nullable=False)
    input_file_path = Column(String(512), nullable=True)

    # Output layer paths (e.g. JSON map of layer_name -> filepath)
    output_layers_json = Column(Text, default="[]")

    # Serialized metadata & analysis breakdown
    metadata_json = Column(Text, nullable=True)
    explainable_breakdown_json = Column(Text, nullable=True)
    provenance_json = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    validations = relationship("ValidationModel", back_populates="job", cascade="all, delete-orphan")


class ValidationModel(Base):
    __tablename__ = "validations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(64), ForeignKey("jobs.id"), nullable=False, index=True)
    observation_source = Column(String(64), default="Sentinel-1")
    metrics_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    job = relationship("JobModel", back_populates="validations")
