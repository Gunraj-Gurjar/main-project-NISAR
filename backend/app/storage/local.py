import os
import shutil
import hashlib
from app.core.config import settings

def save_upload(job_id: str, file_obj) -> str:
    job_dir = os.path.join(settings.STORAGE_DIR, "jobs", job_id, "input")
    os.makedirs(job_dir, exist_ok=True)
    filepath = os.path.join(job_dir, "dem.tif")
    
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file_obj, f)
    return filepath

def compute_hash(filepath: str) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            sha256.update(block)
    return sha256.hexdigest()
