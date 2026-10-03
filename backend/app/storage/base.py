"""
Storage Abstraction Layer.
Cloud-Optimized GeoTIFFs and artifacts are stored via an abstract provider.
Default: LocalDiskStorage (/data).
Easily swapped with S3 / MinIO storage provider.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO, Optional
import shutil


class StorageProvider(ABC):
    @abstractmethod
    def save_bytes(self, key: str, data: bytes) -> str:
        """Store bytes under given key."""
        pass

    @abstractmethod
    def save_file(self, key: str, source_path: Path) -> str:
        """Move or copy a file to storage."""
        pass

    @abstractmethod
    def get_path(self, key: str) -> Path:
        """Return local filesystem path to the asset."""
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Check if asset exists in storage."""
        pass

    @abstractmethod
    def delete(self, key: str) -> bool:
        """Delete asset from storage."""
        pass


class LocalDiskStorage(StorageProvider):
    def __init__(self, base_dir: Path):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        # Prevent directory traversal
        safe_key = key.lstrip("/\\")
        path = (self.base_dir / safe_key).resolve()
        if not str(path).startswith(str(self.base_dir.resolve())):
            raise ValueError(f"Path traversal detected: {key}")
        return path

    def save_bytes(self, key: str, data: bytes) -> str:
        dest = self._resolve(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            f.write(data)
        return str(dest)

    def save_file(self, key: str, source_path: Path) -> str:
        dest = self._resolve(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source_path, dest)
        return str(dest)

    def get_path(self, key: str) -> Path:
        return self._resolve(key)

    def exists(self, key: str) -> bool:
        return self._resolve(key).exists()

    def delete(self, key: str) -> bool:
        p = self._resolve(key)
        if p.exists():
            p.unlink()
            return True
        return False
