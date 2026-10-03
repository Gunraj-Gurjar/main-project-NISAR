"""Job provenance: parameters and library versions."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from typing import Any, Dict

import numpy as np


def library_versions() -> Dict[str, str]:
    versions = {
        "python": sys.version.split()[0],
        "numpy": np.__version__,
    }
    for name in ("scipy", "rasterio", "fastapi", "pydantic", "sqlalchemy", "pysheds"):
        try:
            mod = __import__(name)
            versions[name] = getattr(mod, "__version__", "unknown")
        except ImportError:
            versions[name] = "not-installed"
    return versions


def build_job_provenance(
    *,
    job_id: str,
    preprocess_meta: Dict[str, Any],
    pipeline_parameters: Dict[str, Any],
    terrain_stats: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "job_id": job_id,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "preprocess": preprocess_meta,
        "parameters": pipeline_parameters,
        "terrain_stats": terrain_stats,
        "library_versions": library_versions(),
    }
