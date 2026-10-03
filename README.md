# Nisar Project

This is a modern web application built with Vite, React, TypeScript, and Shadcn UI. It includes routing, state management, and an aesthetic UI framework.

## Features
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + Shadcn UI + Framer Motion
- **Data Visualization**: Plotly.js + Recharts
- **Forms & Validation**: React Hook Form + Zod
- **Routing**: React Router DOM
- **Linting & Formatting**: ESLint + Prettier

## Prerequisites

Make sure you have Node.js installed on your machine.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

3. **Build for production**
   ```bash
   npm run build
   ```

4. **Preview production build**
   ```bash
   npm run preview
   ```

## Folder Structure

- `src/` - Contains the application source code (components, pages, styles, etc.)
- `public/` - Static assets that are served directly
- `components.json` - Shadcn UI configuration file

## Scripts
- `npm run dev`: Starts the local dev server.
- `npm run build`: Bundles the app for production.
- `npm run lint`: Runs ESLint to find issues in your code.
- `npm run test`: Runs tests using Vitest.

## Backend (FastAPI)

Geoprocessing API lives under `backend/`. Full details: [backend/README.md](backend/README.md).

### Docker Compose

```bash
cd backend
docker compose up --build
```

- API: `http://localhost:8000` (docs at `/docs`)
- Postgres + PostGIS on port `5432`
- Shared data volume at `/data` inside the backend container

### curl quick start

```bash
curl http://localhost:8000/api/health

curl -X POST http://localhost:8000/api/jobs \
  -F "file=@dem.tif;type=image/tiff"

curl http://localhost:8000/api/jobs/<job_id>
```

### Backend tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/test_health.py tests/test_upload_validation.py -v
```
