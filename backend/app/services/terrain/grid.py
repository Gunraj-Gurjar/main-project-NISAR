"""Shared raster grid container for terrain pipeline steps."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np
from rasterio.transform import Affine, array_bounds


@dataclass
class DemGrid:
    """Single-band elevation grid in a projected metric CRS."""

    data: np.ndarray
    transform: Affine
    crs: str
    nodata: Optional[float] = None

    @property
    def shape(self) -> Tuple[int, int]:
        return self.data.shape

    @property
    def cell_size_x(self) -> float:
        return abs(float(self.transform.a))

    @property
    def cell_size_y(self) -> float:
        return abs(float(self.transform.e))

    @property
    def cell_size(self) -> float:
        return (self.cell_size_x + self.cell_size_y) / 2.0

    @property
    def bounds(self) -> Tuple[float, float, float, float]:
        h, w = self.shape
        return array_bounds(h, w, self.transform)

    def copy_with(self, data: np.ndarray) -> DemGrid:
        return DemGrid(
            data=data.astype(np.float64, copy=False),
            transform=self.transform,
            crs=self.crs,
            nodata=self.nodata,
        )

    def valid_mask(self) -> np.ndarray:
        return np.isfinite(self.data)
