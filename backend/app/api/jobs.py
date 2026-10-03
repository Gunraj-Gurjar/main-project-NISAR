import json
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import rasterio
from app.services.hazard.flood import FloodModeler

from app.core.database import get_db
from app.models.db import JobModel
from app.models.schemas import (
    AnalysisConfig,
    DemMetadata,
    ExplainableBreakdown,
    JobCreateResponse,
    JobDetailResponse,
    JobStatus,
)
from app.services.dem_validator import DemValidationError, validate_and_extract_dem_metadata
from app.storage import storage
from app.workers.runner import run_screening_task

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.post("", response_model=JobCreateResponse)
async def submit_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Single-band Digital Elevation Model (GeoTIFF) with a defined CRS"),
    config: Optional[str] = Form(None, description="Optional JSON string of analysis weights/parameters"),
    db: Session = Depends(get_db),
):
    """
    Upload and validate a single-band DEM GeoTIFF with CRS.
    Extracts terrain metadata and queues the screening pipeline.
    """
    filename = file.filename or "uploaded_dem.tif"
    if not filename.lower().endswith((".tif", ".tiff")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Uploaded file must be a GeoTIFF (.tif or .tiff).",
        )

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    upload_key = f"uploads/{job_id}_{filename}"

    # Read bytes and persist raw input DEM to storage
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

    raw_path_str = storage.save_bytes(upload_key, content)
    raw_path = Path(raw_path_str)

    # Validate uploaded DEM strictly (single-band + valid CRS + finite elevation)
    try:
        metadata, _ = validate_and_extract_dem_metadata(raw_path)
    except DemValidationError as err:
        storage.delete(upload_key)
        raise HTTPException(status_code=400, detail=str(err))

    # Parse optional analysis configuration
    analysis_config_dict = None
    if config:
        try:
            parsed_cfg = json.loads(config)
            analysis_config_dict = AnalysisConfig(**parsed_cfg).model_dump()
        except Exception as e:
            storage.delete(upload_key)
            raise HTTPException(
                status_code=400,
                detail=f"Invalid analysis config JSON: {str(e)}"
            )

    # Persist job record in DB
    job_record = JobModel(
        id=job_id,
        status=JobStatus.QUEUED.value,
        progress=0.0,
        original_filename=filename,
        input_file_path=raw_path_str,
        metadata_json=metadata.model_dump_json(),
        output_layers_json="[]",
    )
    db.add(job_record)
    db.commit()

    # Enqueue pipeline runner via FastAPI BackgroundTasks
    background_tasks.add_task(
        run_screening_task,
        job_id=job_id,
        raw_dem_path=raw_path_str,
        metadata_dict=metadata.model_dump(),
        config_dict=analysis_config_dict,
    )

    return JobCreateResponse(
        job_id=job_id,
        status=JobStatus.QUEUED,
        metadata=metadata,
        message="DEM uploaded, validated with CRS, and queued for susceptibility screening.",
    )


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Retrieve job execution status, progress, errors, and output layer list."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Screening job '{job_id}' not found.")

    output_layers: List[str] = []
    if job.output_layers_json:
        try:
            output_layers = json.loads(job.output_layers_json)
        except Exception:
            output_layers = []

    metadata = (
        DemMetadata.model_validate_json(job.metadata_json)
        if job.metadata_json
        else None
    )
    breakdown = (
        ExplainableBreakdown.model_validate_json(job.explainable_breakdown_json)
        if job.explainable_breakdown_json
        else None
    )

    provenance = None
    if getattr(job, "provenance_json", None):
        try:
            provenance = json.loads(job.provenance_json)
        except Exception:
            provenance = None

    return JobDetailResponse(
        job_id=job.id,
        status=JobStatus(job.status),
        progress=job.progress,
        error=job.error,
        output_layers=output_layers,
        metadata=metadata,
        explainable_breakdown=breakdown,
        provenance=provenance,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )


@router.get("/{job_id}/layers/{layer_name}")
def get_job_layer(job_id: str, layer_name: str, db: Session = Depends(get_db)):
    """
    Serve generated Cloud-Optimized GeoTIFF (COG), GeoJSON, or provenance JSON for a job layer.
    """
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    geojson_layer_map = {
        "streams_geojson": "streams.geojson",
        "basins": "basins.geojson",
    }
    if layer_name in geojson_layer_map:
        geo_path = storage.get_path(f"jobs/{job_id}/{geojson_layer_map[layer_name]}")
        if geo_path.exists():
            return FileResponse(
                path=str(geo_path),
                media_type="application/geo+json",
                filename=geojson_layer_map[layer_name],
            )

    if layer_name == "provenance":
        prov_path = storage.get_path(f"jobs/{job_id}/provenance.json")
        if prov_path.exists():
            return FileResponse(
                path=str(prov_path),
                media_type="application/json",
                filename=f"{job_id}_provenance.json",
            )

    job_tif = storage.get_path(f"jobs/{job_id}/{layer_name}.tif")
    if job_tif.exists():
        return FileResponse(
            path=str(job_tif),
            media_type="image/tiff",
            filename=f"{job_id}_{layer_name}.tif",
        )

    # Legacy layout fallback
    legacy_tif = storage.get_path(f"cogs/{job_id}_{layer_name}.tif")
    if legacy_tif.exists():
        return FileResponse(path=str(legacy_tif), media_type="image/tiff")

    raise HTTPException(
        status_code=404,
        detail=f"Layer '{layer_name}' not found for job '{job_id}'. Job status is '{job.status}'.",
    )


@router.get("/{job_id}/explain")
def explain_pixel(job_id: str, lat: float, lon: float, db: Session = Depends(get_db)):
    """Explainability endpoint for a specific coordinate."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job or job.status != "done":
        raise HTTPException(status_code=400, detail="Job not found or not finished.")

    modeler = FloodModeler()
    factor_names = [k for k in modeler.config.get("factors", {}).keys()]
    
    factor_values = {}
    normalized_values = {}
    
    coords = [(lon, lat)]
    
    try:
        # Sample each factor raster
        for name in factor_names:
            path = storage.get_path(f"jobs/{job_id}/{name}.tif")
            if path.exists():
                with rasterio.open(path) as src:
                    val = next(src.sample(coords))[0]
                    factor_values[name] = float(val)
                    
                    # Compute normalized value
                    # In a real app we'd load the whole array or cache the bounds,
                    # but for this utility we can just normalize this single point
                    # Wait, we need the array's min/max or percentiles. 
                    # If we don't have it, we should read the whole array.
                    array = src.read(1)
                    norm_array = modeler.normalize_factor(array, modeler.config["factors"][name]["direction"])
                    norm_val = next(rasterio.open(path).sample(coords))[0] # this is raw, we need norm
                    # Let's just find the pixel index
                    row, col = src.index(lon, lat)
                    if 0 <= row < src.height and 0 <= col < src.width:
                        normalized_values[name] = float(norm_array[row, col])
                    else:
                        normalized_values[name] = 0.0

        if not factor_values:
            raise HTTPException(status_code=404, detail="Factor layers not found for this job.")

        # Sample final susceptibility
        sus_path = storage.get_path(f"jobs/{job_id}/susceptibility.tif")
        final_score = 0.0
        class_val = 1
        if sus_path.exists():
            with rasterio.open(sus_path) as src:
                row, col = src.index(lon, lat)
                if 0 <= row < src.height and 0 <= col < src.width:
                    sus_array = src.read(1)
                    final_score = float(sus_array[row, col])
                    class_array = modeler.classify(sus_array)
                    class_val = int(class_array[row, col])
                    
        class_labels = {1: "Low", 2: "Moderate", 3: "High", 4: "Very High"}
        class_label = class_labels.get(class_val, "Unknown")
        
        return modeler.generate_explanation(factor_values, normalized_values, final_score, class_label)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sampling point: {e}")

@router.get("/{job_id}/summary")
def job_summary(job_id: str, db: Session = Depends(get_db)):
    """Summary stats endpoint: area and % per class."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job or job.status != "done":
        raise HTTPException(status_code=400, detail="Job not found or not finished.")
        
    sus_path = storage.get_path(f"jobs/{job_id}/susceptibility.tif")
    if not sus_path.exists():
        raise HTTPException(status_code=404, detail="Susceptibility layer not found.")
        
    modeler = FloodModeler()
    with rasterio.open(sus_path) as src:
        sus_array = src.read(1)
        class_array = modeler.classify(sus_array)
        
        # Estimate pixel area in km2 (assuming pseudo-mercator or projected)
        # For geographic (WGS84), this is a rough approximation
        dx, dy = src.res
        if src.crs.is_geographic:
            # roughly convert deg to km at equator
            cell_area_km2 = (dx * 111) * (dy * 111)
        else:
            cell_area_km2 = (dx * dy) / 1e6
            
        return modeler.get_summary_stats(class_array, cell_area_km2)
