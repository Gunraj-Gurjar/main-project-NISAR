# Terrain Hazard Screening Backend

This is the backend for the Terrain Hazard Screening tool.

## Setup
```bash
docker compose up --build
```
This will start the database and the backend service.

## Running Migrations
The backend service automatically runs `alembic upgrade head` on startup.
To create a new migration:
```bash
docker compose exec backend alembic revision --autogenerate -m "description"
```

## Running Tests
```bash
docker compose run --rm backend pytest
```

## Synthetic DEM
To generate a synthetic DEM for testing:
```bash
docker compose run --rm backend python scripts/make_synthetic_dem.py
```

## API Examples

Health check:
```bash
curl http://localhost:8000/api/health
```

Upload DEM:
```bash
curl -X POST http://localhost:8000/api/jobs -F "dem=@synthetic_dem.tif"
```

Poll job:
```bash
curl http://localhost:8000/api/jobs/job_xxxx
```

## Troubleshooting
- **Port 5432 in use**: Stop local Postgres or change port mapping in docker-compose.yml.
- **Docker daemon not running**: Start Docker Desktop.
- **WSL2 not enabled**: Enable WSL2 in Docker Desktop settings.
- **DB not ready**: The backend waits for the DB using a healthcheck, but if it fails, restart the compose stack.
- **CORS errors**: Ensure `CORS_ORIGINS` in `.env` matches the Vite dev server URL.
