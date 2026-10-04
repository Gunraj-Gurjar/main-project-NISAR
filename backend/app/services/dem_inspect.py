import rasterio
import numpy as np

def inspect_dem(filepath: str) -> dict:
    with rasterio.open(filepath) as src:
        crs = src.crs.to_string() if src.crs else None
        if not crs:
            raise ValueError("No CRS found")
        if src.count != 1:
            raise ValueError("Not a single band GeoTIFF")
            
        band = src.read(1)
        nodata = src.nodata
        
        if nodata is not None:
            valid_data = band[band != nodata]
        else:
            valid_data = band
            
        if valid_data.size == 0:
            min_el, max_el = None, None
        else:
            min_el, max_el = float(np.min(valid_data)), float(np.max(valid_data))

        return {
            "crs": crs,
            "bounds": f"{src.bounds.left},{src.bounds.bottom},{src.bounds.right},{src.bounds.top}",
            "resolution": f"{src.res[0]},{src.res[1]}",
            "nodata": nodata,
            "width": src.width,
            "height": src.height,
            "min_elevation": min_el,
            "max_elevation": max_el
        }
