"""
Unit tests for terrain pipeline on a synthetic 100×100 tilted plane with a V-shaped valley.
Stream thalweg is analytically at column 50; HAND increases ~0.8 m per cell away from the stream.
"""

from __future__ import annotations

import numpy as np
import pytest

from app.services.terrain.condition_dem import condition_dem
from app.services.terrain.distance import distance_to_stream
from app.services.terrain.flow import flow_direction_accumulation
from app.services.terrain.hand import hand
from app.services.terrain.preprocess import grid_from_array
from app.services.terrain.slope_aspect import slope_aspect
from app.services.terrain.stats import terrain_stats
from app.services.terrain.streams import extract_streams
from app.services.terrain.twi import twi


VALLEY_COL = 50
CELL_SIZE = 10.0
VALLEY_GRADIENT = 0.8  # m elevation increase per cell away from thalweg
REGIONAL_SLOPE = 0.5  # m per row (north to south decrease)


@pytest.fixture(scope="module")
def valley_dem_100():
    rows, cols = 100, 100
    row_idx = np.arange(rows, dtype=np.float64)[:, None]
    col_idx = np.arange(cols, dtype=np.float64)[None, :]
    dem = 300.0 - REGIONAL_SLOPE * row_idx + VALLEY_GRADIENT * np.abs(col_idx - VALLEY_COL)
    return grid_from_array(dem, cell_size=CELL_SIZE, origin_x=500000.0, origin_y=3000000.0)


@pytest.fixture(scope="module")
def conditioned_valley(valley_dem_100):
    return condition_dem(valley_dem_100, epsilon=0.01)


@pytest.fixture(scope="module")
def flow_products(conditioned_valley):
    return flow_direction_accumulation(conditioned_valley)


def test_terrain_stats_on_valley(valley_dem_100):
    stats = terrain_stats(valley_dem_100)
    assert stats["min"] is not None
    assert stats["max"] > stats["min"]
    assert stats["std"] > 0
    assert len(stats["histogram"]["counts"]) == 20
    assert "p50" in stats["percentiles"]


def test_slope_reflects_valley_cross_gradient(conditioned_valley):
    slope_g, _ = slope_aspect(conditioned_valley)
    # Cross-section through middle row: higher slope away from thalweg
    mid_row = 50
    slope_profile = slope_g.data[mid_row, 45:56]
    assert slope_profile[5] < slope_profile[0]
    assert slope_profile[5] < slope_profile[-1]


def test_stream_runs_along_valley_thalweg(conditioned_valley, flow_products):
    _, flow_acc = flow_products
    streams_g, _ = extract_streams(flow_acc, threshold_cells=80)
    stream_cols = np.where(np.any(streams_g.data >= 0.5, axis=0))[0]
    assert stream_cols.size > 0
    assert VALLEY_COL - 3 <= int(np.median(stream_cols)) <= VALLEY_COL + 3


def test_flow_accumulation_peaks_in_valley(conditioned_valley, flow_products):
    _, flow_acc = flow_products
    col_maxima = np.argmax(flow_acc.data, axis=1)
    median_peak_col = int(np.median(col_maxima))
    assert VALLEY_COL - 5 <= median_peak_col <= VALLEY_COL + 5


def test_hand_zero_on_stream_increases_away(conditioned_valley, flow_products):
    flow_dir, flow_acc = flow_products
    streams_g, _ = extract_streams(flow_acc, threshold_cells=80)
    hand_g = hand(conditioned_valley, streams_g, flow_dir, flow_acc)

    mid_row = 50
    hand_profile = hand_g.data[mid_row, 48:53]
    assert hand_profile[2] <= 1.0  # on/near thalweg (col 50)
    # ~0.8 m per cell × 2 cells ≈ 1.6 m (allow routing tolerance)
    assert hand_profile[0] > hand_profile[2]
    assert hand_profile[0] == pytest.approx(VALLEY_GRADIENT * 2, abs=1.5)


def test_twi_elevated_in_valley_floor(conditioned_valley, flow_products):
    flow_dir, flow_acc = flow_products
    slope_g, _ = slope_aspect(conditioned_valley)
    twi_g = twi(slope_g, flow_acc, CELL_SIZE)
    valley_twi = np.nanmean(twi_g.data[:, VALLEY_COL - 1 : VALLEY_COL + 2])
    ridge_twi = np.nanmean(twi_g.data[:, 5])
    assert valley_twi > ridge_twi


def test_distance_to_stream(conditioned_valley, flow_products):
    _, flow_acc = flow_products
    streams_g, _ = extract_streams(flow_acc, threshold_cells=80)
    dist_g = distance_to_stream(streams_g)
    on_stream = dist_g.data[50, VALLEY_COL]
    off_stream = dist_g.data[50, VALLEY_COL + 10]
    assert on_stream == pytest.approx(0.0, abs=CELL_SIZE)
    assert off_stream == pytest.approx(10 * CELL_SIZE, abs=CELL_SIZE)
