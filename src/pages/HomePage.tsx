import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Layers,
  ShieldAlert,
  ArrowRight,
  Trash2,
  FolderOpen,
  Sparkles,
  Mountain,
  Info,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject, sampleSources, SampleSource } from "@/context/ProjectContext";
import { StatusChip } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, deleteProject, loadSampleProject } = useProject();

  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const calculateAreaKm2 = (size?: [number, number], res?: [number, number]) => {
    if (!size || !res) return "1.0";
    const areaM2 = size[0] * res[0] * size[1] * res[1];
    return (areaM2 / 1000000).toFixed(1);
  };

  const handleLoadSample = (source: SampleSource) => {
    const sample = loadSampleProject(source);
    navigate(`/project/${sample.id}`);
  };

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete);
      setProjectToDelete(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 w-full">
      {/* Hero Action Header */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-3.5 w-3.5" />
              <span>NISAR Earth Observation & Geoprocessing Platform</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Terrain-Based Flood Susceptibility Screening
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Morphological predisposition assessment using high-resolution DEM hydro-geoprocessing and NISAR L-band SAR validation observations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {/* New Analysis Primary Button */}
            <Button onClick={() => navigate("/new")} size="lg" className="gap-2 font-medium shadow-sm">
              <Plus className="h-4 w-4" />
              <span>New Analysis</span>
            </Button>

            {/* Load Sample Project Button (Configurable Source) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2 border-border font-medium">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Load Sample Project</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Configurable Sample Sources
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sampleSources.map((sample) => (
                  <DropdownMenuItem
                    key={sample.id}
                    onClick={() => handleLoadSample(sample.id)}
                    className="flex flex-col items-start gap-1 p-2.5 cursor-pointer"
                  >
                    <span className="font-semibold text-xs text-foreground">{sample.name}</span>
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      {sample.description}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Informational Capabilities Card (What tool DOES and DOES NOT do) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>What this tool DOES</span>
            </div>
            <ul className="space-y-1 text-muted-foreground pl-6 list-disc leading-relaxed">
              <li>Computes D8 flow accumulation, slope concavity & TWI morphology.</li>
              <li>Calculates explainable 4-step susceptibility score (Low, Moderate, High, Very High).</li>
              <li>Cross-validates terrain screening against NISAR L-band SAR water extent.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>What this tool DOES NOT do</span>
            </div>
            <ul className="space-y-1 text-muted-foreground pl-6 list-disc leading-relaxed">
              <li>Does NOT predict real-time flood event timing or rainfall forecasts.</li>
              <li>Does NOT model hydrodynamic water depth or wave front velocity.</li>
              <li>Does NOT replace official warnings from IMD, CWC, or NDMA.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Projects List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <span>Screening Analysis Projects</span>
          </h2>
          <span className="text-xs text-muted-foreground font-numeric tabular-nums">
            Total Projects: {projects.length}
          </span>
        </div>

        {projects.length === 0 ? (
          /* Empty State when no projects exist */
          <EmptyState
            icon={Layers}
            title="No Screening Projects Found"
            description="Get started by creating a new DEM screening analysis or loading one of our pre-bundled sample projects."
            action={
              <div className="flex items-center gap-3">
                <Button onClick={() => navigate("/new")} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span>New Analysis</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleLoadSample("sf_coastal")}>
                  Load Sample Project
                </Button>
              </div>
            }
          />
        ) : (
          /* Project Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((proj) => {
              const metadata = proj.jobData?.metadata;
              const areaKm2 = calculateAreaKm2(metadata?.size, metadata?.resolution);

              return (
                <div
                  key={proj.id}
                  className="rounded-xl border border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between overflow-hidden group shadow-sm"
                >
                  {/* Thumbnail Placeholder */}
                  <div className="h-36 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 relative flex items-center justify-center border-b border-border overflow-hidden">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5 z-10">
                      <Mountain className="h-8 w-8 text-primary/40 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-numeric tabular-nums font-semibold tracking-wider uppercase">
                        {metadata?.crs || "EPSG:4326"} • DEM GRID
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 z-10">
                      <StatusChip status={proj.status} />
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {proj.name}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-numeric tabular-nums">
                        <span>Area: {areaKm2} km²</span>
                        <span>Date: {new Date(proj.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Card Actions: Open and Delete */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/70 gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProjectToDelete(proj.id)}
                        className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2.5 gap-1.5"
                        aria-label={`Delete project ${proj.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => navigate(`/project/${proj.id}`)}
                        className="text-xs h-8 gap-1.5 font-medium"
                      >
                        <span>Open Workspace</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(projectToDelete)} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <span>Confirm Project Deletion</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete this screening project? This action will remove the project metadata and terrain analysis from your workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel text-xs>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
