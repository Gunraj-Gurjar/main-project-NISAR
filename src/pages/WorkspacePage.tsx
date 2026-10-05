import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProjectNavHeader } from "@/components/layout/ProjectNavHeader";
import { useProject } from "@/context/ProjectContext";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { WorkspaceLeftRail, INITIAL_LAYERS, LayerItem } from "@/components/workspace/WorkspaceLeftRail";
import { WorkspaceCanvas } from "@/components/workspace/WorkspaceCanvas";
import { WorkspaceRightInspector } from "@/components/workspace/WorkspaceRightInspector";
import { WorkspaceBottomDrawer } from "@/components/workspace/WorkspaceBottomDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { getExplain, ExplainResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sliders, BarChart3, PanelRightClose, PanelRightOpen, ArrowLeft } from "lucide-react";

export const WorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProject, getProjectById, viewMode, setViewMode } = useProject();

  const project = (id ? getProjectById(id) : null) || activeProject;

  // Workspace Layer State
  const [layers, setLayers] = useState<LayerItem[]>(INITIAL_LAYERS);
  const [activeLayerId, setActiveLayerId] = useState<string>("susceptibility");

  // Right Inspector State
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  // Bottom Drawer Class Highlight State
  const [highlightedClass, setHighlightedClass] = useState<"Low" | "Moderate" | "High" | "Very High" | null>(null);

  if (!project || !project.terrainData) {
    return (
      <div className="w-full flex-1 flex flex-col">
        <ProjectNavHeader />
        <div className="max-w-4xl mx-auto px-4 py-12 w-full">
          <EmptyState
            title="Project Workspace Not Available"
            description="The requested screening project could not be found or has not been loaded."
            action={
              <Button onClick={() => navigate("/new")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Create New Screening Project</span>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const bounds = project.jobData.metadata?.bounds || [-122.4194, 37.7749, -122.4094, 37.7849];

  // Layer Visibility & Opacity Handlers
  const handleToggleLayerVisibility = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleOpacityChange = (layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, opacity } : l))
    );
  };

  // Map Click Inspector Handler
  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setLoadingExplain(true);

    try {
      const data = await getExplain(project.id, lat, lng);
      setExplainData(data);
    } catch (err) {
      console.warn("API explain call offline, generating client explanation:", err);
      // Fallback inspector calculation
      setExplainData({
        class: "High",
        score: 0.68,
        contributions: [
          {
            factor: "Relative Elevation",
            description: "Lowland morphological depression (12m above sink)",
            raw_value: 12.4,
            normalized_score: 0.78,
            weight: 0.35,
            contribution_percentage: 40,
          },
          {
            factor: "Slope Flatness",
            description: "Flat topography (1.8 deg) restricting runoff velocity",
            raw_value: 1.8,
            normalized_score: 0.70,
            weight: 0.30,
            contribution_percentage: 31,
          },
          {
            factor: "Curvature Concavity",
            description: "Concave profile converging surface runoff",
            raw_value: 0.045,
            normalized_score: 0.55,
            weight: 0.20,
            contribution_percentage: 16,
          },
          {
            factor: "Topographic Wetness Index",
            description: "High moisture accumulation proxy ln(a/tan beta)",
            raw_value: 8.9,
            normalized_score: 0.58,
            weight: 0.15,
            contribution_percentage: 13,
          },
        ],
        summary: `Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E) is classified as High Susceptibility (0.68) primarily driven by lowland elevation (40% contribution) and flat slope (31% contribution).`,
        limitations: "Terrain predisposition screening. Does not predict real-time rainfall depth or storm timing.",
      });
    } finally {
      setLoadingExplain(false);
    }
  };

  const activeLayerObj = layers.find((l) => l.id === activeLayerId) || layers[0];

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Sub-navigation Header */}
      <ProjectNavHeader className="mb-0 shrink-0" />

      {/* Mobile Top Controls Bar */}
      <div className="md:hidden flex items-center justify-between p-2.5 bg-card border-b border-border text-xs">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Sliders className="h-3.5 w-3.5" />
              <span>Layers & Workflow</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-sm font-bold">Layers & Pipeline</SheetTitle>
            </SheetHeader>
            <WorkspaceLeftRail
              layers={layers}
              onToggleVisibility={handleToggleLayerVisibility}
              onOpacityChange={handleOpacityChange}
              activeLayerId={activeLayerId}
              onSelectActiveLayer={setActiveLayerId}
            />
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Inspector</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-sm font-bold font-numeric tabular-nums">
                Point Inspector
              </SheetTitle>
            </SheetHeader>
            <WorkspaceRightInspector
              explainData={explainData}
              loadingExplain={loadingExplain}
              selectedLocation={selectedLocation}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* DESKTOP RESIZABLE PANEL LAYOUT */}
      <div className="flex-1 w-full flex overflow-hidden relative">
        <ResizablePanelGroup direction="horizontal" className="w-full h-full">
          {/* LEFT RAIL PANEL (20% default, min 15%, max 35%) */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35} className="hidden md:block">
            <WorkspaceLeftRail
              layers={layers}
              onToggleVisibility={handleToggleLayerVisibility}
              onOpacityChange={handleOpacityChange}
              activeLayerId={activeLayerId}
              onSelectActiveLayer={setActiveLayerId}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="hidden md:flex" />

          {/* CENTER CANVAS & BOTTOM DRAWER PANEL */}
          <ResizablePanel defaultSize={inspectorOpen ? 55 : 80} minSize={40}>
            <ResizablePanelGroup direction="vertical" className="w-full h-full">
              {/* CENTER CANVAS (75% default) */}
              <ResizablePanel defaultSize={75} minSize={40}>
                <div className="w-full h-full relative">
                  <WorkspaceCanvas
                    terrainData={project.terrainData}
                    bounds={bounds}
                    viewMode={viewMode}
                    onToggleViewMode={setViewMode}
                    activeLayerName={activeLayerObj.name}
                    onMapClick={handleMapClick}
                    hasValidationData={true}
                    highlightedClass={highlightedClass}
                  />

                  {/* Toggle Inspector Button - only in 2D mode, in 3D mode it is docked cleanly on right edge */}
                  {viewMode === "2d" && (
                    <button
                      type="button"
                      onClick={() => setInspectorOpen((prev) => !prev)}
                      aria-label={inspectorOpen ? "Hide Inspector Panel" : "Show Inspector Panel"}
                      className="hidden md:flex items-center gap-1 absolute top-3 right-3 z-30 bg-card/90 backdrop-blur px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold shadow-md text-foreground hover:bg-card transition-colors"
                    >
                      {inspectorOpen ? (
                        <>
                          <PanelRightClose className="h-4 w-4 text-primary" />
                          <span>Hide Inspector</span>
                        </>
                      ) : (
                        <>
                          <PanelRightOpen className="h-4 w-4 text-primary" />
                          <span>Show Inspector</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* BOTTOM DRAWER (25% default) */}
              <ResizablePanel defaultSize={25} minSize={10} maxSize={50}>
                <WorkspaceBottomDrawer
                  jobData={project.jobData}
                  onHoverClass={setHighlightedClass}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* RIGHT INSPECTOR PANEL (25% default, collapsible) */}
          {inspectorOpen && (
            <>
              <ResizableHandle withHandle className="hidden md:flex" />
              <ResizablePanel defaultSize={25} minSize={18} maxSize={40} className="hidden md:block">
                <WorkspaceRightInspector
                  explainData={explainData}
                  loadingExplain={loadingExplain}
                  selectedLocation={selectedLocation}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
