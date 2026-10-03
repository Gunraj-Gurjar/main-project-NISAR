import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobDetailResponse, getLayerUrl, getExplain } from "@/lib/api";
import TerrainViewer from "./TerrainViewer";
import { Map, Source, Layer } from "react-map-gl/maplibre";
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from "./ui/button";

interface DashboardProps {
  jobData: JobDetailResponse;
  terrainData: number[][];
  onBack: () => void;
}

export default function Dashboard({ jobData, terrainData, onBack }: DashboardProps) {
  const [explainData, setExplainData] = useState<any>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [opacity, setOpacity] = useState(0.8);
  const [activeLayer, setActiveLayer] = useState("susceptibility");

  const bounds = jobData.metadata?.bounds || [-180, -90, 180, 90];
  const centerLongitude = (bounds[0] + bounds[2]) / 2;
  const centerLatitude = (bounds[1] + bounds[3]) / 2;

  const handleMapClick = async (e: any) => {
    const { lng, lat } = e.lngLat;
    setLoadingExplain(true);
    try {
      const data = await getExplain(jobData.job_id, lat, lng);
      setExplainData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExplain(false);
    }
  };

  const exportPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      
      const element = document.getElementById("report-content");
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`flood_report_${jobData.job_id}.pdf`);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export PDF.");
    }
  };

  const layers = ["susceptibility", "slope", "curvature", "twi", "relative_elevation"];

  return (
    <div className="pt-20 min-h-screen px-4 pb-12 w-full max-w-7xl mx-auto" id="report-content">
      {/* Persistent Banner */}
      <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground p-3 rounded-lg mb-6 flex items-center justify-center font-medium">
        ⚠️ Terrain-based flood susceptibility screening. Not a flood prediction or official warning.
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold gradient-text">Terrain Analysis Results</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onBack}>Back to Upload</Button>
          <Button onClick={exportPdf}>Export Report PDF</Button>
        </div>
      </div>

      <Tabs defaultValue="terrain" className="w-full">
        <TabsList className="mb-4 flex flex-wrap gap-2 h-auto p-1 bg-background/50 border border-border">
          <TabsTrigger value="terrain">Terrain Intelligence</TabsTrigger>
          <TabsTrigger value="flood">Flood Susceptibility</TabsTrigger>
          <TabsTrigger value="explain">Explain</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="about">About / Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="terrain" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[600px] border border-border rounded-xl overflow-hidden relative">
              <h3 className="absolute top-4 left-4 z-10 font-bold bg-background/80 px-2 rounded">3D Viewer</h3>
              <TerrainViewer elevationData={terrainData} onBack={onBack} />
            </div>
            
            <div className="h-[600px] border border-border rounded-xl overflow-hidden relative">
              <h3 className="absolute top-4 left-4 z-10 font-bold bg-background/80 px-2 rounded">2D Map</h3>
              <div className="absolute top-4 right-4 z-10 bg-background/80 p-2 rounded shadow flex flex-col gap-2">
                <select 
                  className="bg-transparent border p-1 rounded text-sm"
                  value={activeLayer}
                  onChange={(e) => setActiveLayer(e.target.value)}
                >
                  {layers.map(l => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
                </select>
                <input 
                  type="range" min="0" max="1" step="0.1" value={opacity} 
                  onChange={(e) => setOpacity(parseFloat(e.target.value))} 
                />
                <span className="text-xs">Opacity</span>
              </div>
              <Map
                initialViewState={{ longitude: centerLongitude, latitude: centerLatitude, zoom: 11 }}
                mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
              >
                {/* Normally we'd use a COG rendering approach or TileServer, 
                    since the backend serves raw TIFFs, MapLibre can't natively render them easily without a tile server or georaster-layer-for-mapbox.
                    We will assume the backend can serve raster tiles, or we'll render a bounding box placeholder for demo. */}
                <Source type="geojson" data={{
                  type: "Feature", properties: {},
                  geometry: {
                    type: "Polygon",
                    coordinates: [[
                      [bounds[0], bounds[1]],
                      [bounds[2], bounds[1]],
                      [bounds[2], bounds[3]],
                      [bounds[0], bounds[3]],
                      [bounds[0], bounds[1]]
                    ]]
                  }
                }}>
                  <Layer type="line" paint={{ "line-color": "#0ff", "line-width": 2 }} />
                </Source>
              </Map>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="flood" className="space-y-4">
          <div className="glass-card p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Flood Susceptibility Area Stats</h2>
            {jobData.explainable_breakdown?.zones && (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2">Class</th>
                    <th>Pixels</th>
                    <th>Area %</th>
                    <th>Mean Score</th>
                  </tr>
                </thead>
                <tbody>
                  {jobData.explainable_breakdown.zones.map((z, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2">{z.zone_label}</td>
                      <td>{z.pixel_count}</td>
                      <td>{z.area_percentage}%</td>
                      <td>{z.mean_susceptibility_score.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="explain" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[600px] border border-border rounded-xl overflow-hidden relative">
              <h3 className="absolute top-4 left-4 z-10 font-bold bg-background/80 px-2 rounded">Click to explain</h3>
              <Map
                initialViewState={{ longitude: centerLongitude, latitude: centerLatitude, zoom: 11 }}
                mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                onClick={handleMapClick}
                cursor="crosshair"
              >
                <Source type="geojson" data={{
                  type: "Feature", properties: {}, geometry: {
                    type: "Polygon", coordinates: [[
                      [bounds[0], bounds[1]], [bounds[2], bounds[1]], [bounds[2], bounds[3]], [bounds[0], bounds[3]], [bounds[0], bounds[1]]
                    ]]
                  }
                }}>
                  <Layer type="fill" paint={{ "fill-color": "#4a90e2", "fill-opacity": 0.2 }} />
                </Source>
              </Map>
            </div>
            
            <div className="glass-card p-6 rounded-xl overflow-y-auto max-h-[600px]">
              {loadingExplain ? (
                <p>Loading explanation...</p>
              ) : explainData ? (
                <div>
                  <div className="mb-4">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Class</span>
                    <h2 className="text-2xl font-bold">{explainData.class}</h2>
                    <p className="text-sm text-neon-cyan">Score: {explainData.score.toFixed(3)}</p>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-bold border-b border-border pb-2 mb-2">Summary</h3>
                    <p className="text-sm">{explainData.summary}</p>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-bold border-b border-border pb-2 mb-2">Factor Contributions</h3>
                    <div className="space-y-3">
                      {explainData.contributions.map((c: any, i: number) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{c.factor.replace('_', ' ')}</span>
                            <span>{c.contribution_percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-neon-purple h-full rounded-full" style={{ width: `${Math.min(c.contribution_percentage, 100)}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground italic border-t border-border pt-4 mt-4">
                    {explainData.limitations}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center mt-12">Click anywhere on the map to generate an explainability breakdown.</p>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="validation">
          <div className="glass-card p-6 rounded-xl text-center text-muted-foreground">
            Validation functionality is a placeholder.
          </div>
        </TabsContent>
        
        <TabsContent value="about">
          <div className="glass-card p-6 rounded-xl max-w-3xl">
            <h2 className="text-2xl font-bold mb-4">Methodology</h2>
            <p className="mb-4 text-muted-foreground">
              This module implements a weighted multi-criteria overlay using morphological factors.
              Raw inputs are dynamically percentiled and scaled based on directed relationships configured in the system.
            </p>
            <h3 className="text-lg font-bold mb-2">Disclaimer</h3>
            <p className="text-destructive mb-4">
              Terrain-based flood susceptibility screening. Not a flood prediction or official warning.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
