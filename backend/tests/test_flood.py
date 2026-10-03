import pytest
import numpy as np
from app.services.hazard.flood import FloodModeler

@pytest.fixture
def modeler():
    return FloodModeler()

def test_normalization_bounds(modeler):
    array = np.array([[-10, 0, 10], [20, 30, 40], [50, 60, 100]], dtype=np.float32)
    
    # Direct
    norm_direct = modeler.normalize_factor(array, direction="direct")
    assert np.all(norm_direct >= 0.0)
    assert np.all(norm_direct <= 1.0)
    
    # Inverse
    norm_inverse = modeler.normalize_factor(array, direction="inverse")
    assert np.all(norm_inverse >= 0.0)
    assert np.all(norm_inverse <= 1.0)
    
def test_monotonicity_hand(modeler):
    """
    Test monotonicity: lower HAND never decreases susceptibility, all else equal.
    HAND direction is inverse (lower = more susceptible).
    """
    base_factors = {
        "hand": np.array([[10.0, 10.0]], dtype=np.float32),
        "slope": np.array([[5.0, 5.0]], dtype=np.float32),
        "log_flow_accumulation": np.array([[100.0, 100.0]], dtype=np.float32)
    }
    
    susc_base, _ = modeler.compute_susceptibility(base_factors)
    
    # Decrease HAND in the second cell
    lower_hand_factors = {
        "hand": np.array([[10.0, 2.0]], dtype=np.float32),
        "slope": np.array([[5.0, 5.0]], dtype=np.float32),
        "log_flow_accumulation": np.array([[100.0, 100.0]], dtype=np.float32)
    }
    
    susc_lower, _ = modeler.compute_susceptibility(lower_hand_factors)
    
    # Second cell susceptibility should be >= first cell susceptibility 
    # since HAND decreased and it is an inverse factor
    assert susc_lower[0, 1] >= susc_lower[0, 0]
    
def test_contributions_sum(modeler):
    """Ensure contributions sum to 100% in explainability breakdown."""
    factor_values = {
        "hand": 5.0,
        "slope": 2.0,
        "twi": 10.0
    }
    normalized_values = {
        "hand": 0.5,
        "slope": 0.8,
        "twi": 0.9
    }
    # Compute true final score so sum equals 100%
    # Weights from default config: hand=0.25, slope=0.20, twi=0.15. Total=0.60
    # Scaled weights: hand=0.25/0.6, slope=0.20/0.6, twi=0.15/0.6
    final_score = 0.5 * (0.25/0.6) + 0.8 * (0.20/0.6) + 0.9 * (0.15/0.6)
    class_label = "High"
    
    explanation = modeler.generate_explanation(factor_values, normalized_values, final_score, class_label)
    
    total_contribution = sum(c["contribution_percentage"] for c in explanation["contributions"])
    assert pytest.approx(total_contribution, 0.01) == 100.0
