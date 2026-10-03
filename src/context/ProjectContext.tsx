import React, { createContext, useContext, useState } from "react";
import { JobDetailResponse } from "@/lib/api";
import { generateDemoTerrain } from "@/lib/terrain-processor";

export interface ProjectItem {
  id: string;
  name: string;
  status: "queued" | "running" | "done" | "failed";
  createdAt: string;
  jobData: JobDetailResponse;
  terrainData: number[][] | null;
}

export type SampleSource = "sf_coastal" | "alpine_valley" | "flat_basin";

export interface SampleOption {
  id: SampleSource;
  name: string;
  description: string;
}

export const sampleSources: SampleOption[] = [
  { id: "sf_coastal", name: "San Francisco Coastal DEM (100m)", description: "Coastal lowland terrain with ocean/bay interface" },
  { id: "alpine_valley", name: "Himalayan River Valley DEM (30m)", description: "Steep terrain concavities with confined river channels" },
  { id: "flat_basin", name: "Mississippi Basin Floodplain DEM (50m)", description: "Extremely flat topography (<1 deg) limiting drainage velocity" },
];

interface ProjectContextType {
  projects: ProjectItem[];
  activeProjectId: string | null;
  activeProject: ProjectItem | null;
  viewMode: "2d" | "3d";
  setViewMode: (mode: "2d" | "3d") => void;
  addProject: (jobData: JobDetailResponse, terrainData: number[][], name?: string) => ProjectItem;
  deleteProject: (id: string) => void;
  loadSampleProject: (source?: SampleSource) => ProjectItem;
  getProjectById: (id: string) => ProjectItem | undefined;
}

const createSampleJob = (source: SampleSource = "sf_coastal"): JobDetailResponse => {
  const titles = {
    sf_coastal: "San Francisco Coastal Screening (Demo)",
    alpine_valley: "Himalayan Alpine Valley Screening (Demo)",
    flat_basin: "Mississippi Floodplain Screening (Demo)",
  };

  const boundsMap = {
    sf_coastal: [-122.4194, 37.7749, -122.4094, 37.7849] as [number, number, number, number],
    alpine_valley: [85.3240, 27.7172, 85.3340, 27.7272] as [number, number, number, number],
    flat_basin: [-89.1802, 36.9991, -89.1702, 37.0091] as [number, number, number, number],
  };

  return {
    job_id: `sample-${source}-${Date.now().toString(36)}`,
    status: "done",
    progress: 100,
    output_layers: ["susceptibility", "slope", "curvature", "twi", "relative_elevation"],
    created_at: new Date().toISOString(),
    metadata: {
      crs: "EPSG:4326",
      bounds: boundsMap[source],
      resolution: [10, 10],
      nodata: -9999,
      size: [100, 100],
      band_count: 1,
      elevation_min: source === "alpine_valley" ? 1200 : 0,
      elevation_max: source === "alpine_valley" ? 3400 : 850,
      elevation_mean: source === "alpine_valley" ? 2100 : 420,
    },
    explainable_breakdown: {
      zones: [
        { zone_label: "Very High", pixel_count: 600, area_percentage: 6, mean_susceptibility_score: 0.88 },
        { zone_label: "High", pixel_count: 1800, area_percentage: 18, mean_susceptibility_score: 0.65 },
        { zone_label: "Moderate", pixel_count: 3600, area_percentage: 36, mean_susceptibility_score: 0.42 },
        { zone_label: "Low", pixel_count: 4000, area_percentage: 40, mean_susceptibility_score: 0.18 },
      ],
      factor_contributions: [
        { factor_name: "Relative Elevation", weight: 0.35, mean_score: 0.45, contribution_percentage: 38, description: "Lowland morphological depression" },
        { factor_name: "Slope Flatness", weight: 0.30, mean_score: 0.52, contribution_percentage: 32, description: "Impeded overland flow velocity (<3 deg)" },
        { factor_name: "Curvature Concavity", weight: 0.20, mean_score: 0.38, contribution_percentage: 18, description: "Convergent flow concavity" },
        { factor_name: "Topographic Wetness Index", weight: 0.15, mean_score: 0.41, contribution_percentage: 12, description: "Steady-state moisture accumulation proxy" },
      ],
      high_susceptibility_percentage: 24,
      moderate_susceptibility_percentage: 36,
      scientific_disclaimer: "Static terrain morphological screening demo.",
    },
  };
};

const DEFAULT_DEMO_JOB: JobDetailResponse = {
  job_id: "demo-job",
  status: "done",
  progress: 100,
  output_layers: ["susceptibility", "slope", "curvature", "twi", "relative_elevation"],
  created_at: new Date().toISOString(),
  metadata: {
    crs: "EPSG:4326",
    bounds: [-122.4194, 37.7749, -122.4094, 37.7849],
    resolution: [10, 10],
    nodata: -9999,
    size: [100, 100],
    band_count: 1,
    elevation_min: 0,
    elevation_max: 1000,
    elevation_mean: 500,
  },
  explainable_breakdown: {
    zones: [
      { zone_label: "Very High", pixel_count: 500, area_percentage: 5, mean_susceptibility_score: 0.88 },
      { zone_label: "High", pixel_count: 1500, area_percentage: 15, mean_susceptibility_score: 0.65 },
      { zone_label: "Moderate", pixel_count: 3500, area_percentage: 35, mean_susceptibility_score: 0.42 },
      { zone_label: "Low", pixel_count: 4500, area_percentage: 45, mean_susceptibility_score: 0.18 },
    ],
    factor_contributions: [
      { factor_name: "Relative Elevation", weight: 0.35, mean_score: 0.45, contribution_percentage: 38, description: "Lowland morphological depression" },
      { factor_name: "Slope Flatness", weight: 0.30, mean_score: 0.52, contribution_percentage: 32, description: "Impeded overland flow velocity (<3 deg)" },
      { factor_name: "Curvature Concavity", weight: 0.20, mean_score: 0.38, contribution_percentage: 18, description: "Convergent flow concavity" },
      { factor_name: "Topographic Wetness Index", weight: 0.15, mean_score: 0.41, contribution_percentage: 12, description: "Steady-state accumulation proxy ln(a/tan beta)" },
    ],
    high_susceptibility_percentage: 20,
    moderate_susceptibility_percentage: 35,
    scientific_disclaimer: "Static terrain morphological screening. Not a flood forecast or hydrodynamic inundation model.",
  },
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    const demoTerrain = generateDemoTerrain();
    return [
      {
        id: "demo-job",
        name: "San Francisco Coastal Screening (Demo)",
        status: "done",
        createdAt: new Date().toISOString(),
        jobData: DEFAULT_DEMO_JOB,
        terrainData: demoTerrain,
      },
    ];
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>("demo-job");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  const addProject = (jobData: JobDetailResponse, terrainData: number[][], name?: string): ProjectItem => {
    const newProject: ProjectItem = {
      id: jobData.job_id,
      name: name || `Project ${jobData.job_id.slice(0, 8)}`,
      status: jobData.status,
      createdAt: jobData.created_at || new Date().toISOString(),
      jobData,
      terrainData,
    };

    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    return newProject;
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id);
      setActiveProjectId(remaining[0]?.id || null);
    }
  };

  const loadSampleProject = (source: SampleSource = "sf_coastal"): ProjectItem => {
    const sampleJob = createSampleJob(source);
    const terrain = generateDemoTerrain();
    const names = {
      sf_coastal: "San Francisco Coastal DEM (Sample)",
      alpine_valley: "Himalayan Alpine Valley DEM (Sample)",
      flat_basin: "Mississippi Floodplain DEM (Sample)",
    };
    return addProject(sampleJob, terrain, names[source]);
  };

  const getProjectById = (id: string) => {
    return projects.find((p) => p.id === id);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProjectId,
        activeProject,
        viewMode,
        setViewMode,
        addProject,
        deleteProject,
        loadSampleProject,
        getProjectById,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
};

