import numpy as np
import pytest

from app.config import SusceptibilityThresholds, SusceptibilityWeights
from app.core.dem_pipeline import (
    compute_curvature,
    compute_flow_accumulation,
    compute_relative_elevation,
    compute_slope_and_aspect,
    compute_topographic_wetness_index,
)
from app.core.susceptibility import compute_explainable_susceptibility


def test_susceptibility_explainability(synthetic_valley_dem: np.ndarray):
    """Verify that susceptibility score is bounded [0, 1] and factor breakdown is complete."""
    slope, _ = compute_slope_and_aspect(synthetic_valley_dem, 30.0, 30.0)
    curv = compute_curvature(synthetic_valley_dem, 30.0)
    accum = compute_flow_accumulation(synthetic_valley_dem)
    twi = compute_topographic_wetness_index(synthetic_valley_dem, slope, accum, 30.0)
    rel_elev = compute_relative_elevation(synthetic_valley_dem)

    weights = SusceptibilityWeights(
        relative_elevation=0.35,
        slope_flatness=0.30,
        curvature_concavity=0.20,
        topographic_wetness=0.15,
    )
    thresholds = SusceptibilityThresholds(very_high=0.7, high=0.5, moderate=0.3, low=0.0)

    susceptibility, breakdown = compute_explainable_susceptibility(
        relative_elevation=rel_elev,
        slope_deg=slope,
        curvature=curv,
        twi=twi,
        weights=weights,
        thresholds=thresholds,
    )

    # 1. Bounded strictly in [0, 1]
    assert np.all(susceptibility >= 0.0)
    assert np.all(susceptibility <= 1.0)

    # 2. Valley bottom must have higher susceptibility than high ridges
    valley_score = np.mean(susceptibility[:, 4:6])
    ridge_score = np.mean(susceptibility[:, [0, 9]])
    assert valley_score > ridge_score

    # 3. Factor contributions sum to 100%
    total_contrib = sum(f.contribution_percentage for f in breakdown.factor_contributions)
    assert round(total_contrib) == 100

    # 4. Zone distribution sums to 100% of cells
    total_zone_pct = sum(z.area_percentage for z in breakdown.zones)
    assert round(total_zone_pct) == 100

    total_zone_cells = sum(z.pixel_count for z in breakdown.zones)
    assert total_zone_cells == synthetic_valley_dem.size

    # 5. Scientific guardrail disclaimer is strictly present
    assert "DEM-only output shows terrain predisposition" in breakdown.scientific_disclaimer
