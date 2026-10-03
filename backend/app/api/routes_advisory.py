from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.core.advisory_engine import generate_screening_advisory
from app.db.database import get_db
from app.db.models import AdvisoryRecord, JobRecord
from app.schemas import AdvisoryRequest, AdvisoryResponse, ExplainableBreakdown

router = APIRouter(prefix="/api/jobs", tags=["Screening Advisory"])


@router.get("/{job_id}/advisory", response_model=AdvisoryResponse)
def get_job_advisory(job_id: str, db: Session = Depends(get_db)):
    """
    Generate baseline terrain-based screening advisory for a completed job.
    Includes mandatory institutional disclaimer notice.
    """
    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    if not job or job.status != "completed" or not job.explainable_breakdown_json:
        raise HTTPException(
            status_code=400,
            detail="Job must be completed to generate a screening advisory."
        )

    breakdown = ExplainableBreakdown.model_validate_json(job.explainable_breakdown_json)

    advisory = generate_screening_advisory(
        job_id=job_id,
        high_susceptibility_percentage=breakdown.high_susceptibility_percentage,
        rainfall_24h_mm=None,
        rainfall_source="None specified",
        rainfall_thresholds=settings.advisory.rainfall_anomaly_thresholds_mm,
    )
    return advisory


@router.post("/{job_id}/advisory", response_model=AdvisoryResponse)
def post_job_advisory_with_rainfall(
    job_id: str,
    request: AdvisoryRequest,
    db: Session = Depends(get_db),
):
    """
    Generate situational screening advisory integrating rainfall context (e.g. IMD / ERA5).
    Includes mandatory institutional disclaimer notice.
    """
    job = db.query(JobRecord).filter(JobRecord.id == job_id).first()
    if not job or job.status != "completed" or not job.explainable_breakdown_json:
        raise HTTPException(
            status_code=400,
            detail="Job must be completed to generate a screening advisory."
        )

    breakdown = ExplainableBreakdown.model_validate_json(job.explainable_breakdown_json)

    advisory = generate_screening_advisory(
        job_id=job_id,
        high_susceptibility_percentage=breakdown.high_susceptibility_percentage,
        rainfall_24h_mm=request.rainfall_24h_mm,
        rainfall_source=request.rainfall_source or "Configurable",
        rainfall_thresholds=settings.advisory.rainfall_anomaly_thresholds_mm,
    )

    # Persist advisory in database
    rec = AdvisoryRecord(
        job_id=job_id,
        advisory_level=advisory.advisory_level,
        rainfall_24h_mm=request.rainfall_24h_mm,
        rainfall_context=advisory.rainfall_context,
        official_disclaimer=advisory.official_advisory_notice,
    )
    db.add(rec)
    db.commit()

    return advisory
