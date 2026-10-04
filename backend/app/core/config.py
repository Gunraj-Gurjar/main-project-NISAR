from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./terrain.db"
    STORAGE_DIR: str = "./data"
    CORS_ORIGINS: str = "http://localhost:5173"
    MAX_UPLOAD_SIZE: int = 500 * 1024 * 1024

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

