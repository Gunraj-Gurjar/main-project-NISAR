from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProvenanceMetadata(BaseModel):
    sha256_hash: str = Field(..., description="SHA-256 hash of raw input DEM")
    original_filename: str
    input_crs: str = Field(..., description="Input Coordinate Reference System")
    target_crs: str = Field(..., description="Projected metric UTM CRS used for processing")
    resolution_m: float = Field(..., description="Grid cell resolution in metres")
    grid_rows: int
    grid_cols: int
    elevation_min_m: float
    elevation_max_m: float
    elevation_mean_m: float
    parameters: Dict[str, Any] = Field(..., description="Weights, thresholds, and pipeline options")
    library_versions: Dict[str, str] = Field(..., description="Dependencies and versions recorded at runtime")
    created_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FactorContribution(BaseModel):
    factor_name: str
    weight: float
    mean_score: float
    contribution_percentage: float
    description: str


class SusceptibilityZoneSummary(BaseModel):
    zone_label: str = Field(..., description="'Low', 'Moderate', 'High', 'Very High'")
    pixel_count: int
    area_percentage: float
    mean_susceptibility_score: float


class ExplainableBreakdown(BaseModel):
    zones: List[SusceptibilityZoneSummary]
    factor_contributions: List[FactorContribution]
    high_susceptibility_percentage: float
    moderate_susceptibility_percentage: float
    scientific_disclaimer: str


class JobCreateResponse(BaseModel):
    job_id: str
    status: JobStatus
    message: str
    created_at: datetime


class JobDetailResponse(BaseModel):
    job_id: str
    status: JobStatus
    original_filename: str
    provenance: Optional[ProvenanceMetadata] = None
    explainable_breakdown: Optional[ExplainableBreakdown] = None
    available_layers: List[str] = Field(default_factory=list)
    cog_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class ValidationRequest(BaseModel):
    observation_source: str = Field(
        "Sentinel-1",
        description="Observation source: 'Sentinel-1' (C-band) or 'NISAR' (L-band via ASF DAAC)"
    )
    sar_acquisition_date: Optional[str] = None
    water_threshold_db: Optional[float] = Field(
        None,
        description="Radar backscatter amplitude threshold in dB (configurable, not invented)"
    )
    susceptibility_threshold: float = Field(
        0.50,
        description="Susceptibility threshold to compare against empirical SAR water extent"
    )


class ValidationMetrics(BaseModel):
    intersection_over_union_csi: float = Field(..., description="Critical Success Index: TP / (TP + FP + FN)")
    precision: float = Field(..., description="Positive Predictive Value: TP / (TP + FP)")
    recall: float = Field(..., description="Detection Rate / Sensitivity: TP / (TP + FN)")
    f1_score: float = Field(..., description="Harmonic mean of precision and recall")
    true_positive_pixels: int
    false_positive_pixels: int
    false_negative_pixels: int
    true_negative_pixels: int
    sar_inundated_pixels: int
    screened_susceptible_pixels: int
    observation_source: str
    guardrail_note: str = (
        "NISAR L-band / Sentinel-1 SAR observations are derived for empirical validation only. "
        "Terrain-based screening indicates predisposition, not real-time event forecast."
    )


class AdvisoryRequest(BaseModel):
    rainfall_24h_mm: Optional[float] = Field(None, description="Antecedent / forecast 24h precipitation in mm")
    rainfall_source: Optional[str] = Field("Configurable (e.g. IMD / ERA5)", description="Precipitation source")


class AdvisoryResponse(BaseModel):
    job_id: str
    advisory_level: str = Field(..., description="'Elevated Predisposition', 'Guarded', 'Routine Screening'")
    terrain_susceptibility_summary: str
    rainfall_context: Optional[str] = None
    official_advisory_notice: str = (
        "Advisory: terrain-based screening. Not an official warning. "
        "Consult IMD, CWC, NDMA or your State Disaster Management Authority."
    )
    timestamp_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
