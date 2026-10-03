"""
Explainable Flood Susceptibility Screening Engine.
Implements multi-criteria terrain predisposition index with complete factor decomposition.
Strictly adheres to Scientific Guardrails 1, 2, and 6.
"""

from typing import Dict, List, Tuple
import numpy as np

from app.config import SusceptibilityThresholds, SusceptibilityWeights
from app.schemas import ExplainableBreakdown, FactorContribution, SusceptibilityZoneSummary


def normalize_01(arr: np.ndarray, invert: bool = False) -> np.ndarray:
    """Normalize array strictly to [0.0, 1.0]."""
    valid = np.isfinite(arr)
    if not np.any(valid):
        return np.zeros_like(arr, dtype=np.float32)

    min_v = float(np.min(arr[valid]))
    max_v = float(np.max(arr[valid]))
    diff = max_v - min_v if max_v > min_v else 1.0

    norm = (arr - min_v) / diff
    if invert:
        norm = 1.0 - norm
    return np.clip(norm, 0.0, 1.0).astype(np.float32)


def compute_slope_flatness_factor(
    slope_deg: np.ndarray,
    flat_cutoff: float = 3.0,
    steep_cutoff: float = 35.0,
) -> np.ndarray:
    """
    Compute slope flatness predisposition [0, 1].
    Terrain below flat_cutoff (e.g. 3 degrees) has maximum ponding predisposition (1.0).
    Terrain steeper than steep_cutoff (e.g. 35 degrees) has zero ponding predisposition (0.0).
    """
    factor = np.ones_like(slope_deg, dtype=np.float32)
    # Linearly decay from 1.0 to 0.0 between flat_cutoff and steep_cutoff
    steep_mask = slope_deg > flat_cutoff
    factor[steep_mask] = 1.0 - (slope_deg[steep_mask] - flat_cutoff) / (steep_cutoff - flat_cutoff)
    return np.clip(factor, 0.0, 1.0).astype(np.float32)


def compute_explainable_susceptibility(
    relative_elevation: np.ndarray,
    slope_deg: np.ndarray,
    curvature: np.ndarray,
    twi: np.ndarray,
    weights: SusceptibilityWeights,
    thresholds: SusceptibilityThresholds,
    flat_cutoff: float = 3.0,
    steep_cutoff: float = 35.0,
) -> Tuple[np.ndarray, ExplainableBreakdown]:
    """
    Compute explainable flood susceptibility screening score [0, 1]
    using a multi-criteria weighted overlay with explicit factor contributions.
    """
    # 1. Normalize all constituent factor layers strictly to [0, 1]
    factor_rel_elev = np.clip(relative_elevation, 0.0, 1.0)
    factor_slope = compute_slope_flatness_factor(slope_deg, flat_cutoff, steep_cutoff)
    factor_curv = normalize_01(curvature)  # Concave depressions have highest score
    factor_twi = normalize_01(twi)          # High hydrological wetness has highest score

    # 2. Normalize factor weights so they sum to 1.0
    w_sum = (
        weights.relative_elevation
        + weights.slope_flatness
        + weights.curvature_concavity
        + weights.topographic_wetness
    )
    if w_sum <= 0:
        w_sum = 1.0

    w_elev = weights.relative_elevation / w_sum
    w_slope = weights.slope_flatness / w_sum
    w_curv = weights.curvature_concavity / w_sum
    w_twi = weights.topographic_wetness / w_sum

    # 3. Transparent Weighted Linear Combination
    susceptibility = (
        w_elev * factor_rel_elev
        + w_slope * factor_slope
        + w_curv * factor_curv
        + w_twi * factor_twi
    )
    susceptibility = np.clip(susceptibility, 0.0, 1.0).astype(np.float32)

    # 4. Factor contributions & explainability metrics
    total_cells = susceptibility.size
    mean_elev_score = float(np.mean(factor_rel_elev))
    mean_slope_score = float(np.mean(factor_slope))
    mean_curv_score = float(np.mean(factor_curv))
    mean_twi_score = float(np.mean(factor_twi))

    factor_contributions: List[FactorContribution] = [
        FactorContribution(
            factor_name="Relative Elevation",
            weight=round(w_elev, 3),
            mean_score=round(mean_elev_score, 3),
            contribution_percentage=round(w_elev * 100, 1),
            description="Morphological low-lying areas predisposition to ponding",
        ),
        FactorContribution(
            factor_name="Slope Flatness",
            weight=round(w_slope, 3),
            mean_score=round(mean_slope_score, 3),
            contribution_percentage=round(w_slope * 100, 1),
            description="Gentle slopes (< 3°) limit overland runoff velocity",
        ),
        FactorContribution(
            factor_name="Curvature Concavity",
            weight=round(w_curv, 3),
            mean_score=round(mean_curv_score, 3),
            contribution_percentage=round(w_curv * 100, 1),
            description="Concave hollows and depressions concentrate runoff",
        ),
        FactorContribution(
            factor_name="Topographic Wetness Index (TWI)",
            weight=round(w_twi, 3),
            mean_score=round(mean_twi_score, 3),
            contribution_percentage=round(w_twi * 100, 1),
            description="Upslope contributing area vs local drainage gradient",
        ),
    ]

    # 5. Zone categorization
    vhigh_mask = susceptibility >= thresholds.very_high
    high_mask = (susceptibility >= thresholds.high) & ~vhigh_mask
    mod_mask = (susceptibility >= thresholds.moderate) & ~(vhigh_mask | high_mask)
    low_mask = susceptibility < thresholds.moderate

    def make_zone_summary(label: str, mask: np.ndarray) -> SusceptibilityZoneSummary:
        count = int(np.sum(mask))
        pct = (count / total_cells) * 100.0 if total_cells > 0 else 0.0
        mean_s = float(np.mean(susceptibility[mask])) if count > 0 else 0.0
        return SusceptibilityZoneSummary(
            zone_label=label,
            pixel_count=count,
            area_percentage=round(pct, 2),
            mean_susceptibility_score=round(mean_s, 3),
        )

    zones = [
        make_zone_summary("Very High", vhigh_mask),
        make_zone_summary("High", high_mask),
        make_zone_summary("Moderate", mod_mask),
        make_zone_summary("Low", low_mask),
    ]

    vhigh_count = int(np.sum(vhigh_mask))
    high_count = int(np.sum(high_mask))
    mod_count = int(np.sum(mod_mask))

    high_susceptibility_pct = ((vhigh_count + high_count) / total_cells) * 100.0
    moderate_susceptibility_pct = (mod_count / total_cells) * 100.0

    breakdown = ExplainableBreakdown(
        zones=zones,
        factor_contributions=factor_contributions,
        high_susceptibility_percentage=round(high_susceptibility_pct, 2),
        moderate_susceptibility_percentage=round(moderate_susceptibility_pct, 2),
        scientific_disclaimer=(
            "DEM-only output shows terrain predisposition. It does NOT give probability, "
            "timing, depth, or real event extent."
        ),
    )

    return susceptibility, breakdown
