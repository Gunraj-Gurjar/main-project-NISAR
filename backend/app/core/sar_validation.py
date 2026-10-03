"""
SAR Observation Validation Module.
Compares terrain-based flood susceptibility screening zones against satellite SAR-derived
flood inundation extents (Sentinel-1 C-band or NISAR L-band distributed via ASF DAAC).

Strictly adheres to Scientific Guardrails 3 and 5:
- NISAR is used ONLY as an empirical observation source for deriving water extents.
- All validation scores (IoU, precision, recall) are computed directly from pixel confusion.
  NO invented, simulated, or hardcoded statistics.
"""

from typing import Optional
import numpy as np
from scipy import ndimage

from app.schemas import ValidationMetrics


def derive_sar_water_mask(
    sar_backscatter_db: np.ndarray,
    threshold_db: float = -16.0,
    min_cluster_pixels: int = 5,
) -> np.ndarray:
    """
    Derive binary open-water inundation mask from SAR radar backscatter (gamma0 / sigma0 in dB).
    Calm open water produces specular reflectance away from the radar antenna,
    yielding very low backscatter (typically < -16 dB in VH / cross-pol).
    """
    raw_water = sar_backscatter_db <= threshold_db

    # Remove isolated speckle noise clusters smaller than min_cluster_pixels
    labeled_clusters, num_clusters = ndimage.label(raw_water)
    if num_clusters == 0:
        return np.zeros_like(sar_backscatter_db, dtype=bool)

    cluster_sizes = ndimage.sum(raw_water, labeled_clusters, range(num_clusters + 1))
    clean_mask = cluster_sizes >= min_cluster_pixels
    clean_water = clean_mask[labeled_clusters]

    return clean_water.astype(bool)


def evaluate_screening_against_sar(
    susceptibility: np.ndarray,
    sar_water_mask: np.ndarray,
    susceptibility_threshold: float = 0.50,
    observation_source: str = "Sentinel-1",
) -> ValidationMetrics:
    """
    Compute genuine statistical validation metrics comparing static terrain susceptibility
    against observed satellite SAR inundation extent.

    Formulas:
      True Positive (TP): Screened High Susceptibility AND Observed Inundated by SAR
      False Positive (FP): Screened High Susceptibility BUT NOT Inundated by SAR (predisposed dry land)
      False Negative (FN): Inundated by SAR BUT NOT Screened High Susceptibility
      True Negative (TN): Neither Screened High Susceptibility NOR Inundated by SAR

      Critical Success Index (CSI / IoU) = TP / (TP + FP + FN)
      Precision = TP / (TP + FP)
      Recall / Sensitivity = TP / (TP + FN)
      F1 Score = 2 * (Precision * Recall) / (Precision + Recall)
    """
    if susceptibility.shape != sar_water_mask.shape:
        raise ValueError(
            f"Shape mismatch: susceptibility shape {susceptibility.shape} "
            f"vs SAR observation mask shape {sar_water_mask.shape}"
        )

    screened_positive = susceptibility >= susceptibility_threshold
    sar_positive = sar_water_mask.astype(bool)

    tp = int(np.sum(screened_positive & sar_positive))
    fp = int(np.sum(screened_positive & ~sar_positive))
    fn = int(np.sum(~screened_positive & sar_positive))
    tn = int(np.sum(~screened_positive & ~sar_positive))

    union = tp + fp + fn
    iou = float(tp / union) if union > 0 else 0.0

    precision_denom = tp + fp
    precision = float(tp / precision_denom) if precision_denom > 0 else 0.0

    recall_denom = tp + fn
    recall = float(tp / recall_denom) if recall_denom > 0 else 0.0

    f1_denom = precision + recall
    f1 = float(2.0 * precision * recall / f1_denom) if f1_denom > 0 else 0.0

    return ValidationMetrics(
        intersection_over_union_csi=round(iou, 4),
        precision=round(precision, 4),
        recall=round(recall, 4),
        f1_score=round(f1, 4),
        true_positive_pixels=tp,
        false_positive_pixels=fp,
        false_negative_pixels=fn,
        true_negative_pixels=tn,
        sar_inundated_pixels=int(np.sum(sar_positive)),
        screened_susceptible_pixels=int(np.sum(screened_positive)),
        observation_source=observation_source,
    )
