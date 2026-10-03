from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class DemMetadata(BaseModel):
    crs: str = Field(..., description="Coordinate Reference System name or EPSG code")
    bounds: Tuple[float, float, float, float] = Field(..., description="(minx, miny, maxx, maxy)")
    resolution: Tuple[float, float] = Field(..., description="(res_x, res_y)")
    nodata: Optional[float] = Field(None, description="Raster nodata value")
    size: Tuple[int, int] = Field(..., description="(height, width) / (rows, cols)")
    band_count: int = Field(1, description="Number of raster bands (must be 1 for DEM)")
    elevation_min: float = Field(..., description="Minimum valid elevation in metres")
    elevation_max: float = Field(..., description="Maximum valid elevation in metres")
    elevation_mean: float = Field(..., description="Mean elevation in metres")


class AnalysisConfig(BaseModel):
    relative_elevation_weight: Optional[float] = None
    slope_flatness_weight: Optional[float] = None
    curvature_concavity_weight: Optional[float] = None
    topographic_wetness_weight: Optional[float] = None


class JobCreateResponse(BaseModel):
    job_id: str
    status: JobStatus
    metadata: DemMetadata
    message: str


class SusceptibilityZoneSummary(BaseModel):
    zone_label: str = Field(..., description="'Low', 'Moderate', 'High', 'Very High'")
    pixel_count: int
    area_percentage: float
    mean_susceptibility_score: float


class FactorContribution(BaseModel):
    factor_name: str
    weight: float
    mean_score: float
    contribution_percentage: float
    description: str


class ExplainableBreakdown(BaseModel):
    zones: List[SusceptibilityZoneSummary]
    factor_contributions: List[FactorContribution]
    high_susceptibility_percentage: float
    moderate_susceptibility_percentage: float
    scientific_disclaimer: str = (
        "DEM-only output shows terrain predisposition. It does NOT give probability, "
        "timing, depth, or real event extent."
    )


class JobDetailResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = Field(..., description="Job execution progress from 0.0 to 1.0")
    error: Optional[str] = None
    output_layers: List[str] = Field(default_factory=list, description="Terrain layers produced by the job")
    metadata: Optional[DemMetadata] = None
    explainable_breakdown: Optional[ExplainableBreakdown] = None
    provenance: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class ValidationRequest(BaseModel):
    observation_source: str = Field("Sentinel-1", description="'Sentinel-1' or 'NISAR'")
    sar_acquisition_date: Optional[str] = None
    water_threshold_db: Optional[float] = None
    susceptibility_threshold: float = 0.50


class ValidationMetrics(BaseModel):
    intersection_over_union_csi: float
    precision: float
    recall: float
    f1_score: float
    true_positive_pixels: int
    false_positive_pixels: int
    false_negative_pixels: int
    true_negative_pixels: int
    observation_source: str
    guardrail_note: str = (
        "NISAR L-band / Sentinel-1 SAR observations are derived for empirical validation only. "
        "Terrain-based screening indicates predisposition, not real-time event forecast."
    )
