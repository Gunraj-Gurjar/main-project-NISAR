from app.core.config import settings
from app.storage.base import LocalDiskStorage, StorageProvider

# Instantiate default local storage provider
storage: StorageProvider = LocalDiskStorage(settings.storage_dir)

__all__ = ["StorageProvider", "LocalDiskStorage", "storage"]
