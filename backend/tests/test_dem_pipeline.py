import numpy as np
import pytest

from app.core.dem_pipeline import (
    compute_curvature,
    compute_flow_accumulation,
    compute_relative_elevation,
    compute_slope_and_aspect,
    compute_topographic_wetness_index,
    fill_pits,
)


def test_fill_pits(synthetic_sink_dem: np.ndarray):
    """Verify that isolated pit is filled to match spillover elevation."""
    filled = fill_pits(synthetic_sink_dem, epsilon=0.01)
    # The center pit at (2, 2) was 10.0, surrounded by 50.0.
    # After filling, it should be raised to 50.0.
    assert filled[2, 2] >= 50.0
    # Boundary cells should remain unchanged
    assert filled[0, 0] == 50.0


def test_compute_slope_and_aspect_planar(synthetic_planar_slope_dem: np.ndarray):
    """Verify metric slope and aspect calculation on a uniform planar slope."""
    cell_size = 10.0  # 10m cell size
    # dz = 5m across 10m dx -> gradient = 0.5 -> atan(0.5) = ~26.565 degrees
    slope, aspect = compute_slope_and_aspect(synthetic_planar_slope_dem, cell_size, cell_size)

    # In the interior of the grid (away from boundary effects)
    interior_slope = slope[2:8, 2:8]
    expected_slope_deg = np.degrees(np.arctan(5.0 / cell_size))
    assert np.allclose(interior_slope, expected_slope_deg, atol=1.0)

    # Slope descends towards the East (azimuth ~ 90 degrees)
    interior_aspect = aspect[2:8, 2:8]
    assert np.all(interior_aspect > 70.0)
    assert np.all(interior_aspect < 110.0)


def test_compute_curvature(synthetic_valley_dem: np.ndarray):
    """Verify that curvature distinguishes concave valley floor from valley sides."""
    curvature = compute_curvature(synthetic_valley_dem, cell_size=30.0)
    assert curvature.shape == synthetic_valley_dem.shape

    # Valley floor at column 4 & 5 is a topographic concavity (positive Laplacian)
    valley_curvature = curvature[4, 4]
    assert valley_curvature >= 0.0


def test_flow_accumulation_converges_to_valley(synthetic_valley_dem: np.ndarray):
    """Verify that D8 flow accumulation routes runoff from ridge walls to valley floor."""
    accum = compute_flow_accumulation(synthetic_valley_dem)
    assert accum.shape == synthetic_valley_dem.shape

    # The valley floor (col 4 or 5) must accumulate significantly more flow than valley walls (col 0 or 9)
    max_valley_accum = np.max(accum[:, 4:6])
    wall_accum = accum[0, 0]
    assert max_valley_accum > wall_accum * 3.0


def test_topographic_wetness_index(synthetic_valley_dem: np.ndarray):
    """Verify that TWI is highest in the valley bottom where flow accumulates."""
    slope, _ = compute_slope_and_aspect(synthetic_valley_dem, 30.0, 30.0)
    accum = compute_flow_accumulation(synthetic_valley_dem)
    twi = compute_topographic_wetness_index(synthetic_valley_dem, slope, accum, 30.0)

    assert twi.shape == synthetic_valley_dem.shape
    assert np.all(np.isfinite(twi))
    # Valley floor should have higher TWI than ridge walls
    mean_valley_twi = np.mean(twi[:, 4:6])
    mean_wall_twi = np.mean(twi[:, [0, 9]])
    assert mean_valley_twi > mean_wall_twi


def test_relative_elevation(synthetic_valley_dem: np.ndarray):
    """Verify that normalized relative elevation assigns 1.0 to lowest valley floor."""
    rel_elev = compute_relative_elevation(synthetic_valley_dem)
    assert rel_elev.shape == synthetic_valley_dem.shape
    assert np.min(rel_elev) == 0.0
    assert np.max(rel_elev) == 1.0

    # Minimum elevation in synthetic_valley_dem is at row 0, col 4 or 5
    assert rel_elev[0, 4] >= 0.95
