# TerraSpectra AI / NISAR Platform - Project Overview

## 1. Project Summary
**TerraSpectra AI** (also known as the NISAR Flood Susceptibility Platform) is an advanced web-based geospatial application designed for **Terrain Predisposition Screening**. 

The primary goal of the application is to ingest raw geographic data (like Digital Elevation Models) and process it to determine which geographical areas are most susceptible to flooding. It achieves this by analyzing various topographical factors such as relative elevation, slope flatness, terrain concavity, and topographic wetness indexes.

The platform provides an "Explainable AI" approach, allowing researchers and planners to not only see *where* flood risks exist but mathematically understand *why* a specific coordinate was flagged as high-risk.

---

## 2. Workspace Screen Breakdown

When you load into a project analysis screen (the Workspace Page), the interface is divided into several highly interactive panels designed to help you explore the data.

### The Main Map Canvas (Center)
This is the core interactive visualization area of the application.
* **Functionality:** It visualizes your terrain data in either 2D or 3D view modes. 
* **Visuals:** The map is overlaid with color-coded "susceptibility" layers ranging from Low to Very High risk. 
* **Interaction:** You can pan, zoom, and most importantly, **click on specific coordinates** on the map to run an instant analysis on that exact point.

### Layers & Workflow Panel (Left Sidebar)
This panel acts as your control center for what data is currently visible on the canvas.
* **Layer Toggles:** Turn different geospatial layers on and off. For instance, you can hide the raw elevation map to only see the final risk classification.
* **Opacity Controls:** Adjust the transparency of layers so you can overlay and compare multiple datasets (like viewing roads underneath a flood risk layer).
* **Active Layer:** Select which specific dataset the map should prioritize or emphasize.

### The Point Inspector (Right Sidebar)
This is the analytical engine of the UI. It activates whenever you click a specific location on the Main Map Canvas.
* **Risk Classification:** Displays the overall susceptibility score for the selected coordinate (Low, Moderate, High, or Very High).
* **Explainable AI Breakdown:** It lists the exact topographical factors that contributed to the score (e.g., "Flat topography" or "Lowland elevation") and shows the exact percentage each factor contributed to the final risk assessment.

### Bottom Data Drawer (Bottom Panel)
This panel provides aggregate statistics and project-wide metadata.
* **Project Overview:** Displays high-level information about the current dataset or "job" being processed.
* **Class Highlighting:** Features a chart or legend showing the distribution of susceptibility classes across the entire map. Hovering over a specific class (like "High Risk") in this drawer highlights those corresponding zones on the central map, allowing you to instantly isolate problematic areas.

### Top Navigation Header
This bar provides context for where you are in the application. It includes breadcrumbs and navigation links allowing you to easily switch between the main workspace, uploading new data, viewing model validation metrics, or generating final exportable reports.

## ADDENDUM: Illustrative Flood Simulation
- The simulation is a SCENARIO DEMO on sample Himalayan terrain. It is not a real event, not a forecast, not
  validated. Every simulation view must carry a persistent label: "Illustrative simulation on sample terrain.
  Not a real event or a prediction."
- Never use "prediction", "forecast", "early warning" or imply a real date/location/event.
- Routing and inundation must be DERIVED from the DEM (flow direction, accumulation, HAND), not hand-drawn
  polygons or random noise.
- All speeds, stage values and decay rates are configurable and documented as illustrative defaults.