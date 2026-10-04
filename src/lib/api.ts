// API client for backend
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface DemMetadata {
  crs: string;
  bounds: [number, number, number, number]; // minx, miny, maxx, maxy
  resolution: [number, number];
  nodata: number | null;
  size: [number, number];
  band_count: number;
  elevation_min: number;
  elevation_max: number;
  elevation_mean: number;
}

export interface JobCreateResponse {
  job_id: string;
  status: JobStatus;
  metadata: DemMetadata;
  message: string;
}

export interface SusceptibilityZoneSummary {
  zone_label: string;
  pixel_count: number;
  area_percentage: number;
  mean_susceptibility_score: number;
}

export interface FactorContribution {
  factor_name: string;
  weight: number;
  mean_score: number;
  contribution_percentage: number;
  description: string;
}

export interface ExplainableBreakdown {
  zones: SusceptibilityZoneSummary[];
  factor_contributions: FactorContribution[];
  high_susceptibility_percentage: number;
  moderate_susceptibility_percentage: number;
  scientific_disclaimer: string;
}

export interface JobDetailResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  error?: string | null;
  output_layers: string[];
  metadata?: DemMetadata | null;
  explainable_breakdown?: ExplainableBreakdown | null;
  provenance?: Record<string, any> | null;
  created_at: string;
  completed_at?: string | null;
}

export interface ExplainResponse {
  class: string;
  score: number;
  contributions: Array<{
    factor: string;
    description: string;
    raw_value: number;
    normalized_score: number;
    weight: number;
    contribution_percentage: number;
  }>;
  summary: string;
  limitations: string;
}

export interface SummaryResponse {
  [key: string]: {
    area_km2: number;
    percentage: number;
  };
}

export const submitJob = async (file: File, config?: any): Promise<JobCreateResponse> => {
  const formData = new FormData();
  formData.append("dem", file);
  formData.append("file", file);
  if (config) {
    formData.append("config", JSON.stringify(config));
  }

  const response = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to submit job");
  }

  return response.json();
};

export const getJobStatus = async (jobId: string): Promise<JobDetailResponse> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch job status: ${response.statusText}`);
  }

  return response.json();
};

export const getExplain = async (jobId: string, lat: number, lon: number): Promise<ExplainResponse> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/explain?lat=${lat}&lon=${lon}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to get explanation");
  }

  return response.json();
};

export const getSummary = async (jobId: string): Promise<SummaryResponse> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/summary`);
  
  if (!response.ok) {
    throw new Error("Failed to get summary");
  }

  return response.json();
};

export const getLayerUrl = (jobId: string, layerName: string): string => {
  return `${API_URL}/jobs/${jobId}/layers/${layerName}`;
};
