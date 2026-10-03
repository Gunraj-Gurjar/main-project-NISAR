import numpy as np
import pytest

from app.core.sar_validation import derive_sar_water_mask, evaluate_screening_against_sar


def test_derive_sar_water_mask():
    """Verify that radar specular water thresholding and cluster filtering work correctly."""
    # Synthetic radar backscatter in dB: dry land ~ -10dB, open calm water ~ -20dB
    sar_db = np.full((10, 10), -10.0, dtype=np.float32)

    # Place a 3x3 water body in center (-20 dB) -> 9 pixels (> min_cluster_pixels=5)
    sar_db[3:6, 3:6] = -20.0
    # Place a 1-pixel isolated noise speckle (-22 dB) -> 1 pixel (< min_cluster_pixels=5)
    sar_db[0, 0] = -22.0

    water_mask = derive_sar_water_mask(sar_db, threshold_db=-16.0, min_cluster_pixels=5)

    # 3x3 block should be detected as water
    assert np.all(water_mask[3:6, 3:6])
    assert int(np.sum(water_mask[3:6, 3:6])) == 9

    # Isolated 1-pixel speckle must be filtered out
    assert not water_mask[0, 0]

    # Dry land must not be detected
    assert not water_mask[8, 8]


def test_evaluate_screening_against_sar_exact_metrics():
    """Verify that IoU, Precision, Recall, and confusion matrix match exact mathematical definitions."""
    # 4-pixel grid
    # True Positives: 1, False Positives: 1, False Negatives: 1, True Negatives: 1
    susceptibility = np.array([
        [0.8, 0.8],   # Both screened positive (threshold = 0.5)
        [0.2, 0.2],   # Both screened negative
    ], dtype=np.float32)

    sar_water_mask = np.array([
        [True, False],  # (0,0) is TP, (0,1) is FP
        [True, False],  # (1,0) is FN, (1,1) is TN
    ], dtype=bool)

    metrics = evaluate_screening_against_sar(
        susceptibility=susceptibility,
        sar_water_mask=sar_water_mask,
        susceptibility_threshold=0.50,
        observation_source="NISAR L-band",
    )

    assert metrics.true_positive_pixels == 1
    assert metrics.false_positive_pixels == 1
    assert metrics.false_negative_pixels == 1
    assert metrics.true_negative_pixels == 1

    # CSI / IoU = TP / (TP + FP + FN) = 1 / 3 = ~0.3333
    assert abs(metrics.intersection_over_union_csi - (1.0 / 3.0)) < 1e-3

    # Precision = TP / (TP + FP) = 1 / 2 = 0.5
    assert abs(metrics.precision - 0.5) < 1e-3

    # Recall = TP / (TP + FN) = 1 / 2 = 0.5
    assert abs(metrics.recall - 0.5) < 1e-3

    # Guardrail: Never claim NISAR supplies DEM
    assert "NISAR L-band / Sentinel-1 SAR observations are derived for empirical validation only" in metrics.guardrail_note
