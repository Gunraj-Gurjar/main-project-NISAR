from pathlib import Path
from typing import Dict, List, Optional
import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


class SusceptibilityWeights(BaseModel):
    relative_elevation: float = Field(0.35, description="Weight for relative lowlands")
    slope_flatness: float = Field(0.30, description="Weight for gentle terrain")
    curvature_concavity: float = Field(0.20, description="Weight for concave hollows")
    topographic_wetness: float = Field(0.15, description="Weight for topographic wetness index")


class SusceptibilityThresholds(BaseModel):
    very_high: float = 0.70
    high: float = 0.50
    moderate: float = 0.30
    low: float = 0.00


class HydrologyConfig(BaseModel):
    pit_fill_epsilon_m: float = 0.01
    flow_accumulation_threshold: int = 100
    slope_flatness_cutoff_deg: float = 3.0
    slope_steep_cutoff_deg: float = 35.0


class SarValidationConfig(BaseModel):
    asf_daac_base_url: str = "https://datapool.asf.alaska.edu"
    sentinel1_db_threshold: float = -16.0
    nisar_lband_db_threshold: float = -18.0
    min_water_cluster_pixels: int = 5


class AdvisoryConfig(BaseModel):
    official_disclaimer: str = (
        "Advisory: terrain-based screening. Not an official warning. "
        "Consult IMD, CWC, NDMA or your State Disaster Management Authority."
    )
    rainfall_anomaly_thresholds_mm: Dict[str, float] = {
        "heavy": 64.5,
        "very_heavy": 115.6,
        "extremely_heavy": 204.5,
    }


class Settings(BaseSettings):
    app_name: str = "Terrain Hazard Screening Platform"
    version: str = "1.0.0"
    storage_dir: Path = Path("data")
    database_url: str = "sqlite:///./terrain_screening.db"
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    config_file: Optional[Path] = None

    susceptibility_weights: SusceptibilityWeights = SusceptibilityWeights()
    susceptibility_thresholds: SusceptibilityThresholds = SusceptibilityThresholds()
    hydrology: HydrologyConfig = HydrologyConfig()
    sar_validation: SarValidationConfig = SarValidationConfig()
    advisory: AdvisoryConfig = AdvisoryConfig()

    model_config = {"env_file": ".env", "extra": "allow"}


def load_settings(config_path: Optional[Path] = None) -> Settings:
    default_config_path = Path(__file__).resolve().parent.parent / "config.yaml"
    chosen_path = config_path or default_config_path

    yaml_data = {}
    if chosen_path.exists():
        with open(chosen_path, "r", encoding="utf-8") as f:
            yaml_data = yaml.safe_load(f) or {}

    system_dict = yaml_data.get("system", {})
    init_kwargs = {
        "app_name": system_dict.get("app_name", "Terrain Hazard Screening Platform"),
        "version": system_dict.get("version", "1.0.0"),
        "storage_dir": Path(system_dict.get("storage_dir", "data")),
        "cors_origins": system_dict.get("cors_origins", ["*"]),
    }

    if "susceptibility_weights" in yaml_data:
        init_kwargs["susceptibility_weights"] = SusceptibilityWeights(**yaml_data["susceptibility_weights"])
    if "susceptibility_thresholds" in yaml_data:
        init_kwargs["susceptibility_thresholds"] = SusceptibilityThresholds(**yaml_data["susceptibility_thresholds"])
    if "hydrology" in yaml_data:
        init_kwargs["hydrology"] = HydrologyConfig(**yaml_data["hydrology"])
    if "sar_validation" in yaml_data:
        init_kwargs["sar_validation"] = SarValidationConfig(**yaml_data["sar_validation"])
    if "advisory" in yaml_data:
        init_kwargs["advisory"] = AdvisoryConfig(**yaml_data["advisory"])

    return Settings(**init_kwargs)


settings = load_settings()
