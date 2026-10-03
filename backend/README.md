# Terrain Hazard Screening — Python Backend

FastAPI geoprocessing service for DEM upload, validation, and background terrain screening. Job state is stored in PostgreSQL (PostGIS image); raster artifacts live on a shared `/data` volume.

## Stack

| Piece | Choice |
| --- | --- |
| API | FastAPI + Uvicorn |
| Jobs | **FastAPI `BackgroundTasks`** (no Redis/RQ worker — simpler for a single-process dev stack) |
| DB | SQLAlchemy + Alembic on PostGIS-enabled Postgres |
| Geo | rasterio / GDAL (Docker image) |

## Run with Docker Compose

From this directory:

```bash
docker compose up --build
```

Services:

- **backend** — `http://localhost:8000` (OpenAPI at `/docs`)
- **db** — Postgres 16 + PostGIS on `localhost:5432`
- **local_data** — named volume mounted at `/data` in the backend container

Environment (set in `docker-compose.yml`):

- `DATABASE_URL=postgresql://terrain_user:terrain_secure_password@db:5432/terrain_db`
- `STORAGE_DIR=/data`

On startup the backend runs `alembic upgrade head`, then Uvicorn.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness |
| `POST` | `/api/jobs` | Multipart: `file` (GeoTIFF) + optional `config` (JSON string) → `{ job_id, ... }` |
| `GET` | `/api/jobs/{job_id}` | Status: `queued` / `running` / `done` / `failed`, progress, error, output layers |
| `GET` | `/api/jobs/{job_id}/layers/{layer_name}` | COG (`.tif`) or GeoJSON |

CORS is enabled for the Vite dev server (`http://localhost:5173`).

### curl examples

Health:

```bash
curl -s http://localhost:8000/api/health | jq
```

Submit a DEM (optional analysis weights as JSON):

```bash
curl -s -X POST http://localhost:8000/api/jobs \
  -F "file=@/path/to/dem.tif;type=image/tiff" \
  -F 'config={"relative_elevation_weight":0.4}' | jq
```

Poll job status:

```bash
curl -s http://localhost:8000/api/jobs/job_abc123def456 | jq
```

Download a result layer (when `status` is `done`):

```bash
curl -O -J http://localhost:8000/api/jobs/job_abc123def456/layers/susceptibility
```

## Local development (without Docker)

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://terrain_user:terrain_secure_password@localhost:5432/terrain_db  # optional; falls back to SQLite
uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
pip install -r requirements.txt
pytest tests/test_health.py tests/test_upload_validation.py -v
```

Upload validation rejects non–single-band GeoTIFFs, missing CRS, and bad extensions; valid uploads return CRS, bounds, resolution, nodata, size, and min/max/mean elevation.

## Layout

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, routers
│   ├── api/                 # health, jobs routers
│   ├── core/                # config, database
│   ├── models/              # SQLAlchemy + Pydantic schemas
│   ├── services/            # DEM validation, pipeline steps
│   ├── storage/             # local /data abstraction
│   └── workers/             # BackgroundTasks job runner
├── alembic/                 # migrations (jobs, validations + PostGIS ext)
├── tests/
├── docker-compose.yml
├── Dockerfile
└── config.yaml
```
