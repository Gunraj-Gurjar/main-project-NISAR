from datetime import datetime, timezone
import hashlib
import sys
from pathlib import Path
from typing import Any, Dict
import numpy as np

from app.schemas import ProvenanceMetadata


def calculate_sha256(file_path: Path) -> str:
    """Calculate SHA-256 hash of a file efficiently in chunks."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()


def get_runtime_library_versions() -> Dict[str, str]:
    """Capture exact runtime environment library versions."""
    versions = {
        "python": sys.version.split()[0],
        "numpy": np.__version__,
    }
    for mod_name in ["scipy", "tifffile", "fastapi", "pydantic", "sqlalchemy"]:
        try:
            mod = __import__(mod_name)
            versions[mod_name] = getattr(mod, "__version__", "unknown")
        except ImportError:
            versions[mod_name] = "not-installed"
    return versions


def build_provenance_record(
    input_file_path: Path,
    original_filename: str,
    input_crs: str,
    target_crs: str,
    resolution_m: float,
    dem_array: np.ndarray,
    parameters: Dict[str, Any],
) -> ProvenanceMetadata:
    """Generate reproducible provenance record for geoprocessing execution."""
    sha256 = calculate_sha256(input_file_path)
    lib_versions = get_runtime_library_versions()

    valid_mask = np.isfinite(dem_array)
    elev_min = float(np.min(dem_array[valid_mask])) if np.any(valid_mask) else 0.0
    elev_max = float(np.max(dem_array[valid_mask])) if np.any(valid_mask) else 0.0
    elev_mean = float(np.mean(dem_array[valid_mask])) if np.any(valid_mask) else 0.0

    return ProvenanceMetadata(
        sha256_hash=sha256,
        original_filename=original_filename,
        input_crs=input_crs,
        target_crs=target_crs,
        resolution_m=resolution_m,
        grid_rows=dem_array.shape[0],
        grid_cols=dem_array.shape[1],
        elevation_min_m=elev_min,
        elevation_max_m=elev_max,
        elevation_mean_m=elev_mean,
        parameters=parameters,
        library_versions=lib_versions,
        created_at_utc=datetime.now(timezone.utc),
    )
