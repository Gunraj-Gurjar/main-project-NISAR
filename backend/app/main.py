from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, jobs
from app.core.config import settings

app = FastAPI(title="Terrain Hazard Screening")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
