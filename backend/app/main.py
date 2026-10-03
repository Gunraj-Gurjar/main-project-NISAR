from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.jobs import router as jobs_router
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables (creates tables if not already applied by Alembic)
    try:
        init_db()
    except Exception as e:
        print(f"[Startup Warning] Could not auto-init DB: {e}")
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Terrain Hazard Screening Platform - Geoprocessing Backend Service",
    lifespan=lifespan,
)

# Enable CORS for Vite dev server (http://localhost:5173) and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health_router)
app.include_router(jobs_router)


@app.get("/")
def root():
    return {
        "service": settings.app_name,
        "version": settings.version,
        "status": "online",
        "documentation": "/docs",
    }
