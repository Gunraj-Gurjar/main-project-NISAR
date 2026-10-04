from sqlalchemy import Column, String, Integer, Float, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, index=True)
    status = Column(String, default="queued")
    progress = Column(Integer, default=0)
    error = Column(String, nullable=True)
    crs = Column(String, nullable=True)
    bounds = Column(String, nullable=True)
    resolution = Column(String, nullable=True)
    nodata = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    min_elevation = Column(Float, nullable=True)
    max_elevation = Column(Float, nullable=True)
    input_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
