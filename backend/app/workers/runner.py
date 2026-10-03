import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.db import JobModel
from app.models.schemas import AnalysisConfig, DemMetadata, JobStatus
from app.services.terrain.pipeline import run_terrain_pipeline
from app.storage import storage


def run_screening_task(
    job_id: str,
    raw_dem_path: str,
    metadata_dict: dict,
    config_dict: Optional[dict] = None,
):
    """
    Background job execution runner (FastAPI BackgroundTasks — no Redis/RQ).
    Runs terrain analysis pipeline and persists outputs under jobs/{job_id}/.
    """
    db = SessionLocal()
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        db.close()
        return

    try:
        job.status = JobStatus.RUNNING.value
        job.progress = 0.1
        db.commit()

        metadata = DemMetadata(**metadata_dict)
        config = AnalysisConfig(**config_dict) if config_dict else None

        job.progress = 0.25
        db.commit()

        layer_names, provenance = run_terrain_pipeline(
            job_id=job_id,
            raw_dem_path=Path(raw_dem_path),
            metadata=metadata,
            storage_base=settings.storage_dir,
            config=config,
        )

        job.progress = 0.95
        db.commit()

        job.status = JobStatus.DONE.value
        job.progress = 1.0
        job.output_layers_json = json.dumps(layer_names)
        job.provenance_json = json.dumps(provenance)
        job.explainable_breakdown_json = None
        job.completed_at = datetime.now(timezone.utc)
        db.commit()

    except Exception as e:
        job.status = JobStatus.FAILED.value
        job.error = str(e)
        job.progress = 0.0
        db.commit()
    finally:
        db.close()
