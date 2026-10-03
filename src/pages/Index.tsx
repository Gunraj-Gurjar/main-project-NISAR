import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import UploadSection from "@/components/UploadSection";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import TerrainViewer from "@/components/TerrainViewer";
import ApplicationsSection from "@/components/ApplicationsSection";
import AboutSection from "@/components/AboutSection";
import Dashboard from "@/components/Dashboard";
import { processGeoTiff, generateDemoTerrain } from "@/lib/terrain-processor";
import { submitJob, getJobStatus, JobDetailResponse } from "@/lib/api";

type AppView = "hero" | "upload" | "viewer" | "applications" | "about";

const Index = () => {
  const [view, setView] = useState<AppView>("hero");
  const [isProcessing, setIsProcessing] = useState(false);
  const [terrainData, setTerrainData] = useState<number[][] | null>(null);
  const [jobData, setJobData] = useState<JobDetailResponse | null>(null);

  const handleProcess = async (processor: () => Promise<number[][]>) => {
    setIsProcessing(true);
    try {
      // Small delay so the processing animation looks real
      const [data] = await Promise.all([
        processor(),
        new Promise((r) => setTimeout(r, 4000)),
      ]);
      setTerrainData(data);
      setView("viewer");
    } catch (err) {
      console.error("Processing error:", err);
      alert("Failed to process terrain data. Please try a valid DEM file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    try {
      // Run both the client-side 3D view processing and the backend job submission
      const terrainPromise = processGeoTiff(file);
      const jobResponse = await submitJob(file);
      
      let currentStatus = await getJobStatus(jobResponse.job_id);
      while (currentStatus.status === "queued" || currentStatus.status === "running") {
        await new Promise(r => setTimeout(r, 2000));
        currentStatus = await getJobStatus(jobResponse.job_id);
      }
      
      if (currentStatus.status === "failed") {
        throw new Error(currentStatus.error || "Backend processing failed");
      }
      
      setJobData(currentStatus);
      const data = await terrainPromise;
      setTerrainData(data);
      setView("viewer");
    } catch (err) {
      console.error("Processing error:", err);
      alert("Failed to process terrain data. Ensure the backend is running.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDemoSelect = () => {
    const mockJobData: JobDetailResponse = {
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
        elevation_mean: 500
      },
      explainable_breakdown: {
        zones: [
          { zone_label: "High", pixel_count: 1000, area_percentage: 10, mean_susceptibility_score: 0.8 },
          { zone_label: "Moderate", pixel_count: 3000, area_percentage: 30, mean_susceptibility_score: 0.5 },
          { zone_label: "Low", pixel_count: 6000, area_percentage: 60, mean_susceptibility_score: 0.2 }
        ],
        factor_contributions: [],
        high_susceptibility_percentage: 10,
        moderate_susceptibility_percentage: 30,
        scientific_disclaimer: "Demo data"
      }
    };
    setJobData(mockJobData);
    handleProcess(() => Promise.resolve(generateDemoTerrain()));
  };

  return (
    <div className="min-h-screen bg-background text-foreground grid-bg scanline">
      <AnimatedBackground />
      <Navbar onNavClick={(v) => setView(v as AppView)} />

      <AnimatePresence mode="wait">
        {isProcessing && <ProcessingOverlay />}
      </AnimatePresence>

      {view === "hero" && (
        <HeroSection onGetStarted={() => setView("upload")} />
      )}

      {view === "applications" && (
        <ApplicationsSection />
      )}

      {view === "about" && (
        <AboutSection />
      )}

      {view === "upload" && (
        <div className="min-h-screen flex items-center justify-center pt-20">
          <UploadSection
            onFileSelect={handleFileSelect}
            onDemoSelect={handleDemoSelect}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {view === "viewer" && terrainData && jobData && (
        <Dashboard
          jobData={jobData}
          terrainData={terrainData}
          onBack={() => setView("upload")}
        />
      )}
    </div>
  );
};

export default Index;
