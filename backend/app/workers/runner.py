from sqlalchemy.orm import Session
from app.models.job import Job
from app.core.database import SessionLocal
from app.services.dem_inspect import inspect_dem
from app.storage.local import compute_hash
import os
from app.core.config import settings

def run_job(job_id: str):
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        db.close()
        return

    try:
        job.status = "running"
        db.commit()
        
        filepath = os.path.join(settings.STORAGE_DIR, "jobs", job_id, "input", "dem.tif")
        job.input_hash = compute_hash(filepath)
        
        meta = inspect_dem(filepath)
        job.crs = meta["crs"]
        job.bounds = meta["bounds"]
        job.resolution = meta["resolution"]
        job.nodata = meta["nodata"]
        job.width = meta["width"]
        job.height = meta["height"]
        job.min_elevation = meta["min_elevation"]
        job.max_elevation = meta["max_elevation"]
        job.progress = 100
        job.status = "succeeded"
    except Exception as e:
        job.status = "failed"
        job.error = str(e)
    finally:
        db.commit()
        db.close()
