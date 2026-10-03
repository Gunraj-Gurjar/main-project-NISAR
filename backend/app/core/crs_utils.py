import math
from typing import Tuple


def determine_utm_crs(longitude: float, latitude: float) -> Tuple[int, str]:
    """
    Determine the optimal metric UTM EPSG code and PROJ string based on geographic centroid.
    Formula:
      zone = floor((longitude + 180) / 6) + 1
      EPSG = 32600 + zone (North) or 32700 + zone (South)
    """
    # Wrap longitude to [-180, 180]
    lon = ((longitude + 180) % 360) - 180
    zone = int(math.floor((lon + 180) / 6.0)) + 1
    zone = max(1, min(60, zone))

    is_northern = latitude >= 0.0
    epsg_code = (32600 + zone) if is_northern else (32700 + zone)
    crs_name = f"EPSG:{epsg_code} (UTM Zone {zone}{'N' if is_northern else 'S'})"

    return epsg_code, crs_name


def approximate_degree_to_meters(lat_deg: float) -> Tuple[float, float]:
    """
    Approximate distance in metres for 1 degree of latitude and longitude at a given latitude.
    Used for fallback metric cell size when input DEM is in geographic WGS84.
    """
    lat_rad = math.radians(lat_deg)
    # WGS84 ellipsoid parameters
    m_per_lat = 111132.92 - 559.82 * math.cos(2 * lat_rad) + 1.175 * math.cos(4 * lat_rad)
    m_per_lon = 111412.84 * math.cos(lat_rad) - 93.5 * math.cos(3 * lat_rad)
    return max(1.0, m_per_lat), max(1.0, m_per_lon)
