import json
import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import JobRecord
from app.schemas import (
    ExplainableBreakdown,
    JobCreateResponse,
    JobDetailResponse,
    JobStatus,
    ProvenanceMetadata,
)
from app.storage import storage
from app.worker.background_runner import process_screening_job

router = APIRouter(prefix="/api/jobs", tags=["Screening Jobs"])


@router.post("", response_model=JobCreateResponse)
async def submit_screening_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a Digital Elevation Model (GeoTIFF) to initiate hydrological
    terrain predisposition screening.
    """
    if not file.filename.lower().endswith((".tif", ".tiff")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a standard GeoTIFF (.tif or .tiff) DEM file."
        )

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    raw_key = f"uploads/{job_id}_{file.filename}"

    # Read and store uploaded DEM
    content = await file.read()
    dest_path = storage.save_bytes(raw_key, content)

    # Record job in database
    job_record = JobRecord(
        id=job_id,
        original_filename=file.filename,
        status="pending",
        input_file_path=dest_path,
    )
    db.add(job_record)
    db.commit()

    # Trigger background worker task
    background_tasks.add_task(
        process_screening_job,
        job_id=job_id,
        file_path_str=dest_path,
        original_filename=file.filename,
    )

    return JobCreateResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        message="DEM ingested. Hydrological factor extraction and susceptibility screening queued.",
        created_at=job_record.created_at,
    )


@router.get("", response_model=List[JobDetailResponse])
def list_screening_jobs(db: Session = Depends(get_db)):
    """List recent screening jobs."""
    jobs = db.query(JobRecord).order_by(JobRecord.created_at.desc()).limit(50).all()
    results = []
    for j in jobs:
        provenance = (
            ProvenanceMetadata.model_validate_json(j.provenance_json)
            if j.provenance_json
            else None
        )
        breakdown = (
            ExplainableBreakdown.model_validate_json(j.explainable_breakdown_json)
            if j.explainable_breakdown_json
            else None
        )
        results.append(
            JobDetailResponse(
                job_id=j.id,
                status=JobStatus(j.status),
                original_filename=j.original_filename,
                provenance=provenance,
                explainable_breakdown=breakdown,
                available_layers=["elevation", "slope", "curvature", "twi", "susceptibility"],
                cog_url=f"/api/jobs/{j.id}/cog" if j.cog_path else None,
                error_message=j.error_message,
                created_at=j.created_at,
                completed_at=j.completed_at,
            )
        )
    return results


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job_detail(job_id: str, db: Session = Depends(get_db)):
    """Retrieve job execution status, complete provenance, and explainability breakdown."""
    j = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Screening job not found.")

    provenance = (
        ProvenanceMetadata.model_validate_json(j.provenance_json)
        if j.provenance_json
        else None
    )
    breakdown = (
        ExplainableBreakdown.model_validate_json(j.explainable_breakdown_json)
        if j.explainable_breakdown_json
        else None
    )

    return JobDetailResponse(
        job_id=j.id,
        status=JobStatus(j.status),
        original_filename=j.original_filename,
        provenance=provenance,
        explainable_breakdown=breakdown,
        available_layers=["elevation", "slope", "curvature", "twi", "susceptibility"],
        cog_url=f"/api/jobs/{j.id}/cog" if j.cog_path else None,
        error_message=j.error_message,
        created_at=j.created_at,
        completed_at=j.completed_at,
    )


@router.get("/{job_id}/cog")
def download_cog(job_id: str, db: Session = Depends(get_db)):
    """Download or stream Cloud-Optimized GeoTIFF (COG) screening output."""
    j = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    if not j or not j.cog_path:
        raise HTTPException(status_code=404, detail="COG output not found or job still processing.")

    cog_file = Path(j.cog_path)
    if not cog_file.exists():
        raise HTTPException(status_code=404, detail="COG file missing from storage.")

    return FileResponse(
        path=str(cog_file),
        media_type="image/tiff",
        filename=f"{job_id}_susceptibility_screening.tif",
    )
