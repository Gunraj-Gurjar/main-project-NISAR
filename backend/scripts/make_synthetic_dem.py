import rasterio
from rasterio.transform import from_origin
import numpy as np
import os

def create_dem():
    width = 100
    height = 100
    res = 30.0
    
    transform = from_origin(500000.0, 4000000.0, res, res)
    crs = 'EPSG:32644'
    
    data = np.zeros((height, width), dtype=np.float32)
    for y in range(height):
        for x in range(width):
            data[y, x] = 100.0 + (x * 0.5) + (y * 0.2)
            
    out_path = os.path.join(os.path.dirname(__file__), '..', 'synthetic_dem.tif')
    with rasterio.open(
        out_path,
        'w',
        driver='GTiff',
        height=height,
        width=width,
        count=1,
        dtype=data.dtype,
        crs=crs,
        transform=transform,
        nodata=-9999.0
    ) as dst:
        dst.write(data, 1)

if __name__ == '__main__':
    create_dem()
    print("Created synthetic_dem.tif")
