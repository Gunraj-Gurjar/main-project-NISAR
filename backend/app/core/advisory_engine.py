"""
Rainfall-Aware Screening Advisory Generator.
Produces non-official situational screening advisory combining static terrain
predisposition with rainfall context.

Strictly adheres to Scientific Guardrail 4:
Every advisory output MUST include the exact institutional notice:
"Advisory: terrain-based screening. Not an official warning.
Consult IMD, CWC, NDMA or your State Disaster Management Authority."
"""

from typing import Dict, Optional
from datetime import datetime, timezone

from app.schemas import AdvisoryResponse


MANDATORY_DISCLAIMER = (
    "Advisory: terrain-based screening. Not an official warning. "
    "Consult IMD, CWC, NDMA or your State Disaster Management Authority."
)


def generate_screening_advisory(
    job_id: str,
    high_susceptibility_percentage: float,
    rainfall_24h_mm: Optional[float] = None,
    rainfall_source: Optional[str] = "Configurable",
    rainfall_thresholds: Optional[Dict[str, float]] = None,
) -> AdvisoryResponse:
    """
    Generate situational screening advisory combining terrain predisposition with rainfall triggers.
    Uses configurable thresholds (e.g. IMD standards), never hardcoded or invented statistics.
    """
    thresholds = rainfall_thresholds or {
        "heavy": 64.5,
        "very_heavy": 115.6,
        "extremely_heavy": 204.5,
    }

    # Determine qualitative advisory level
    if rainfall_24h_mm is not None and rainfall_24h_mm >= thresholds["heavy"]:
        if high_susceptibility_percentage >= 25.0 or rainfall_24h_mm >= thresholds["very_heavy"]:
            advisory_level = "Elevated Predisposition"
            rain_ctx = (
                f"Rainfall context: {rainfall_24h_mm:.1f} mm/24h exceeds IMD heavy precipitation criteria. "
                f"Terrain exhibits {high_susceptibility_percentage:.1f}% high susceptibility predisposition."
            )
        else:
            advisory_level = "Guarded Predisposition"
            rain_ctx = (
                f"Rainfall context: {rainfall_24h_mm:.1f} mm/24h recorded ({rainfall_source}). "
                f"Moderate terrain predisposition screening ({high_susceptibility_percentage:.1f}% high zones)."
            )
    else:
        advisory_level = "Routine Screening"
        rain_val_str = f"{rainfall_24h_mm:.1f} mm" if rainfall_24h_mm is not None else "No precipitation data supplied"
        rain_ctx = (
            f"Precipitation: {rain_val_str} ({rainfall_source}). "
            f"Static morphological screening shows {high_susceptibility_percentage:.1f}% high predisposition terrain."
        )

    terrain_summary = (
        f"Terrain-based screening identifies {high_susceptibility_percentage:.1f}% of the area "
        f"with high to very high morphological predisposition to runoff accumulation."
    )

    return AdvisoryResponse(
        job_id=job_id,
        advisory_level=advisory_level,
        terrain_susceptibility_summary=terrain_summary,
        rainfall_context=rain_ctx,
        official_advisory_notice=MANDATORY_DISCLAIMER,
        timestamp_utc=datetime.now(timezone.utc),
    )
