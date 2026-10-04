from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.job import Job
import uuid
import os
from app.core.config import settings
from app.storage.local import save_upload
from app.workers.runner import run_job

router = APIRouter()

@router.post("/jobs")
def create_job(
    background_tasks: BackgroundTasks,
    dem: UploadFile = File(None),
    file: UploadFile = File(None),
    config: str = Form("{}"),
    db: Session = Depends(get_db)
):
    upload_file = dem or file
    if not upload_file:
        raise HTTPException(status_code=400, detail="No file provided")
    if not upload_file.filename.endswith(('.tif', '.tiff')):
        raise HTTPException(status_code=400, detail="Only GeoTIFFs are allowed")
    
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    filepath = save_upload(job_id, upload_file.file)
    
    if os.path.getsize(filepath) > settings.MAX_UPLOAD_SIZE:
        os.remove(filepath)
        raise HTTPException(status_code=400, detail="File too large")

    import rasterio
    try:
        with rasterio.open(filepath) as src:
            if not src.crs:
                raise ValueError("No CRS found")
            if src.count != 1:
                raise ValueError("Not a single band GeoTIFF")
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(status_code=400, detail=str(e))

    job = Job(id=job_id, status="queued")
    db.add(job)
    db.commit()

    background_tasks.add_task(run_job, job_id)
    return {"job_id": job_id}

@router.get("/jobs/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "status": job.status,
        "progress": job.progress,
        "error": job.error,
        "input_metadata": {
            "crs": job.crs,
            "bounds": job.bounds,
            "resolution": job.resolution,
            "nodata": job.nodata,
            "width": job.width,
            "height": job.height,
            "min_elevation": job.min_elevation,
            "max_elevation": job.max_elevation
        },
        "provenance": {
            "input_hash": job.input_hash,
            "timestamp": job.created_at
        },
        "layers": []
    }

@router.get("/jobs/{job_id}/layers/{layer_name}")
def get_layer(job_id: str, layer_name: str):
    raise HTTPException(status_code=404, detail="No layers available yet")
