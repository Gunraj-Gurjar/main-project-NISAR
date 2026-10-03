import yaml
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

class FloodModeler:
    def __init__(self, config_path: str = None):
        if config_path is None:
            # Default to backend/config/flood_weights.yaml relative to this file's parents
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.config_path = base_dir / "config" / "flood_weights.yaml"
        else:
            self.config_path = Path(config_path)
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        with open(self.config_path, "r") as f:
            return yaml.safe_load(f)
            
    def normalize_factor(self, array: np.ndarray, direction: str) -> np.ndarray:
        """Normalize factor to 0-1 using 1st and 99th percentiles (robust to outliers)."""
        valid = np.isfinite(array)
        if not np.any(valid):
            return np.zeros_like(array)
            
        p1 = np.percentile(array[valid], 1)
        p99 = np.percentile(array[valid], 99)
        
        diff = p99 - p1 if p99 > p1 else 1.0
        norm = np.clip((array - p1) / diff, 0.0, 1.0)
        
        if direction == "inverse":
            norm = 1.0 - norm
            
        out = np.zeros_like(array, dtype=np.float32)
        out[valid] = norm[valid]
        return out
        
    def compute_susceptibility(self, factors: Dict[str, np.ndarray]) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
        """Compute weighted overlay susceptibility from factors."""
        factor_configs = self.config.get("factors", {})
        
        # Calculate sum of weights for used factors
        total_weight = 0.0
        used_factors = []
        for name in factors.keys():
            if name in factor_configs:
                total_weight += factor_configs[name]["weight"]
                used_factors.append(name)
                
        if total_weight == 0.0:
            total_weight = 1.0
            
        susceptibility = None
        normalized_factors = {}
        
        for name in used_factors:
            f_cfg = factor_configs[name]
            weight = f_cfg["weight"] / total_weight
            
            norm_array = self.normalize_factor(factors[name], f_cfg["direction"])
            normalized_factors[name] = norm_array
            
            if susceptibility is None:
                susceptibility = np.zeros_like(norm_array, dtype=np.float32)
                
            susceptibility += norm_array * weight
            
        return susceptibility, normalized_factors

    def classify(self, susceptibility: np.ndarray) -> np.ndarray:
        """Classify susceptibility into Low (1), Moderate (2), High (3), Very High (4)."""
        cls_config = self.config.get("classification", {})
        method = cls_config.get("method", "quantile")
        
        valid = np.isfinite(susceptibility)
        out = np.zeros_like(susceptibility, dtype=np.uint8)
        
        if method == "fixed":
            thresh = cls_config.get("thresholds", {})
            low_t = thresh.get("low", 0.25)
            mod_t = thresh.get("moderate", 0.50)
            high_t = thresh.get("high", 0.75)
            
            out[valid & (susceptibility <= low_t)] = 1
            out[valid & (susceptibility > low_t) & (susceptibility <= mod_t)] = 2
            out[valid & (susceptibility > mod_t) & (susceptibility <= high_t)] = 3
            out[valid & (susceptibility > high_t)] = 4
        else: # quantile
            if np.any(valid):
                vals = susceptibility[valid]
                p25 = np.percentile(vals, 25)
                p50 = np.percentile(vals, 50)
                p75 = np.percentile(vals, 75)
                
                out[valid & (susceptibility <= p25)] = 1
                out[valid & (susceptibility > p25) & (susceptibility <= p50)] = 2
                out[valid & (susceptibility > p50) & (susceptibility <= p75)] = 3
                out[valid & (susceptibility > p75)] = 4
                
        return out

    def get_legend(self) -> Dict[str, Any]:
        """Return legend JSON for classification."""
        return {
            "classes": [
                {"value": 1, "label": "Low"},
                {"value": 2, "label": "Moderate"},
                {"value": 3, "label": "High"},
                {"value": 4, "label": "Very High"}
            ]
        }

    def generate_explanation(self, factor_values: Dict[str, float], normalized_values: Dict[str, float], final_score: float, class_label: str) -> Dict[str, Any]:
        """Generate explainability breakdown for a specific point."""
        factor_configs = self.config.get("factors", {})
        total_weight = sum(factor_configs[k]["weight"] for k in factor_values.keys() if k in factor_configs) or 1.0
        
        contributions = []
        for name, raw_val in factor_values.items():
            if name in factor_configs:
                f_cfg = factor_configs[name]
                norm_val = normalized_values[name]
                weight = f_cfg["weight"] / total_weight
                contrib_pct = (norm_val * weight / final_score * 100) if final_score > 0 else 0.0
                
                contributions.append({
                    "factor": name,
                    "description": f_cfg["description"],
                    "raw_value": raw_val,
                    "normalized_score": norm_val,
                    "weight": weight,
                    "contribution_percentage": contrib_pct
                })
                
        contributions.sort(key=lambda x: x["contribution_percentage"], reverse=True)
        
        # Build plain-English summary
        summary_parts = []
        for c in contributions[:2]: # Top 2 contributors
            summary_parts.append(f"{c['factor'].replace('_', ' ')} ({c['contribution_percentage']:.1f}% contribution)")
            
        summary = f"This location is classified as {class_label} susceptibility with a score of {final_score:.3f}. "
        if summary_parts:
            summary += f"The primary driving factors are {', '.join(summary_parts)}. "
            
        limitations = (
            "These weights and factors are purely illustrative and must be calibrated. "
            "This output indicates terrain predisposition only. It is not a prediction and is not a hazard map."
        )
        
        return {
            "class": class_label,
            "score": final_score,
            "contributions": contributions,
            "summary": summary,
            "limitations": limitations
        }

    def sensitivity_analysis(self, factors: Dict[str, np.ndarray], perturb_pct: float = 0.20) -> Dict[str, Any]:
        """Run sensitivity analysis by perturbing each weight."""
        base_susc, _ = self.compute_susceptibility(factors)
        base_class = self.classify(base_susc)
        
        total_cells = np.sum(np.isfinite(base_susc))
        if total_cells == 0:
            return {}
            
        def get_area_fraction(cls_array: np.ndarray) -> Dict[int, float]:
            return {
                1: float(np.sum(cls_array == 1) / total_cells),
                2: float(np.sum(cls_array == 2) / total_cells),
                3: float(np.sum(cls_array == 3) / total_cells),
                4: float(np.sum(cls_array == 4) / total_cells)
            }
            
        base_frac = get_area_fraction(base_class)
        
        factor_configs = self.config.get("factors", {})
        used_factors = [f for f in factors.keys() if f in factor_configs]
        
        results = {
            "baseline_area_fraction": base_frac,
            "perturbations": {}
        }
        
        original_weights = {f: factor_configs[f]["weight"] for f in used_factors}
        
        for name in used_factors:
            for mult, label in [(1.0 + perturb_pct, f"+{int(perturb_pct*100)}%"), (1.0 - perturb_pct, f"-{int(perturb_pct*100)}%")]:
                # Temporarily update weight
                self.config["factors"][name]["weight"] = original_weights[name] * mult
                
                new_susc, _ = self.compute_susceptibility(factors)
                new_class = self.classify(new_susc)
                
                new_frac = get_area_fraction(new_class)
                changed_pixels = np.sum((new_class != base_class) & np.isfinite(base_class))
                change_frac = float(changed_pixels / total_cells)
                
                results["perturbations"][f"{name}_{label}"] = {
                    "area_fraction": new_frac,
                    "class_change_fraction": change_frac
                }
                
                # Restore weight
                self.config["factors"][name]["weight"] = original_weights[name]
                
        return results

    def get_summary_stats(self, class_array: np.ndarray, cell_area_km2: float) -> Dict[str, Any]:
        """Get summary stats: area (km2) and % per class."""
        valid_mask = class_array > 0
        total_cells = np.sum(valid_mask)
        
        if total_cells == 0:
            return {}
            
        stats = {}
        class_labels = {1: "Low", 2: "Moderate", 3: "High", 4: "Very High"}
        
        for val, label in class_labels.items():
            count = np.sum(class_array == val)
            area = count * cell_area_km2
            pct = (count / total_cells) * 100.0
            stats[label] = {
                "area_km2": float(area),
                "percentage": float(pct)
            }
            
        return stats
