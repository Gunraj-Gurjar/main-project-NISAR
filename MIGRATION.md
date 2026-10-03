# Frontend Redesign & Architectural Migration Notes

## 1. Overview
The frontend application was migrated from a legacy single-tab prototype (`Index.tsx` / `Dashboard.tsx`) into a modern, accessible, multi-route React Router DOM application (`react-router-dom` v6) structured around dedicated domain pages and a resizable workspace panel system.

---

## 2. Route Architecture

| Route Path | View / Component | Purpose |
| :--- | :--- | :--- |
| `/` | [`HomePage`](file:///c:/Users/samim/OneDrive/Desktop/projects/main-project-nisar/src/pages/HomePage.tsx) | Project Overview, status summary cards, configurable sample loader, capabilities empty state. |
| `/new` | [`NewProjectPage`](file:///c:/Users/samim/OneDrive/Desktop/projects/main-project-nisar/src/pages/NewProjectPage.tsx) | 3-Step New Analysis Wizard (Area & DEM upload, Options & Weights, Review & Staged Execution). |
| `/project/:id` | [`WorkspacePage`](file:///c:/Users/samim/OneDrive/Desktop/projects/main-project-nisar/src/pages/WorkspacePage.tsx) | Core Resizable Panel Workspace (Left Rail layer stack, 2D/3D map canvas, location inspector, bottom drawer analytics). |
| `/project/:id/validation` | [`ValidationPage`](file:///c:/Users/samim/OneDrive/Desktop/projects/main-project-nisar/src/pages/ValidationPage.tsx) | Physical SAR Validation (NISAR L-band & Sentinel-1 C-band matrix, IoU, ROC curve, canopy penetration notes). |
| `/project/:id/advisories` | [`AdvisoriesPage`](file:///c:/Users/samim/OneDrive/Desktop/projects/main-project-nisar/src/pages/AdvisoriesPage.tsx) | Rainfall-Aware Advisories (IMD intensity scenarios, historical precipitation replay, card disclaimers). |
| `/project/:id/report` | [`ReportPage`](file:///c:/Users/samim/OneDrive/Desktop/projects/main-project-nisar/src/pages/ReportPage.tsx) | Executive Report Generator & PDF Exporter (`jspdf` + `html2canvas`). |
| `/methods` | [`MethodsPage`](file:///c:/Users/samim/OneDrive/Desktop/projects/main-project-nisar/src/pages/MethodsPage.tsx) | Geoprocessing Pipeline Diagram, Factor Equations, Terminology Guide, Scientific Disclaimers. |

---

## 3. Design System Tokens & Palette

- **Colorblind-Safe 4-Step Susceptibility Palette**:
  - **Low**: Pale Yellow (`--susceptibility-low` / `#fef08a`)
  - **Moderate**: Orange (`--susceptibility-moderate` / `#f97316`)
  - **High**: Red (`--susceptibility-high` / `#ef4444`)
  - **Very High**: Deep Purple (`--susceptibility-very-high` / `#6b21a8`)
- **Typography**: Inter for sans-serif UI; JetBrains Mono for numeric/coordinate figures with `font-numeric tabular-nums`.
- **Accessibility**: Visible focus rings (`:focus-visible`), ARIA attributes (`role="status"`, `role="alert"`, `role="region"`), high contrast AA support, `@media (prefers-reduced-motion)` rules.

---

## 4. Scientific Guardrails Enforced

1. **Static Morphological Screening**: Clarified on all pages that DEM geoprocessing computes static terrain susceptibility, NOT real-time flood forecasts, timing, or hydrodynamic inundation depth.
2. **NISAR Radar Function**: NISAR L-band SAR observations provide physical water extent validation via backscatter thresholding; NISAR does **NOT** provide elevation data.
3. **No Fake Alerts**: Advisory bulletins are labeled strictly for screening. No SMS/push alert simulations or fake evacuation commands.
