import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Layers,
  Plus,
  Download,
  HelpCircle,
  Sun,
  Moon,
  Box,
  Map as MapIcon,
  ChevronDown,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusChip } from "@/components/shared/StatusChip";
import { useProject } from "@/context/ProjectContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, activeProject, viewMode, setViewMode } = useProject();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Check if current route is the main workspace (/project/:id)
  const isWorkspaceRoute = Boolean(
    location.pathname.match(/^\/project\/[^/]+$/)
  );

  const currentProjectId = activeProject?.id || "demo-job";

  return (
    <>
      <header className="w-full bg-card border-b border-border sticky top-0 z-40 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 font-bold text-base text-foreground hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1"
              aria-label="NISAR FloodSusceptibility Platform Home"
            >
              <div className="p-1.5 rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Layers className="h-4 w-4" />
              </div>
              <span className="tracking-tight">
                NISAR <span className="text-primary font-normal">FloodSusceptibility</span>
              </span>
            </Link>

            {/* Status Chip */}
            {activeProject && (
              <StatusChip status={activeProject.status} className="hidden sm:inline-flex" />
            )}
          </div>

          {/* Center: Project Switcher */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 px-3 border-border bg-background text-xs font-medium focus-visible:ring-ring max-w-[220px] truncate"
                  aria-label="Project Switcher"
                >
                  <span className="truncate">{activeProject ? activeProject.name : "Select Project"}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Active Projects
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projects.map((proj) => (
                  <DropdownMenuItem
                    key={proj.id}
                    onClick={() => navigate(`/project/${proj.id}`)}
                    className="flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="truncate font-medium">{proj.name}</span>
                    <StatusChip status={proj.status} className="text-[10px] py-0 px-1.5" />
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/new")}
                  className="gap-2 text-xs font-medium text-primary cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ New Screening Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 2D/3D Toggle (Workspace Only) */}
            {isWorkspaceRoute && (
              <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode("2d")}
                  aria-pressed={viewMode === "2d"}
                  aria-label="Switch to 2D Map View"
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm font-medium transition-all ${
                    viewMode === "2d"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  <span>2D Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("3d")}
                  aria-pressed={viewMode === "3d"}
                  aria-label="Switch to 3D Elevation View"
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-sm font-medium transition-all ${
                    viewMode === "3d"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Box className="h-3.5 w-3.5" />
                  <span>3D Terrain</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Actions: Export, Help, Theme Toggle */}
          <div className="flex items-center gap-2">
            {/* Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/project/${currentProjectId}/report`)}
              className="h-8 gap-1.5 text-xs border-border"
              aria-label="Export Project Report"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Export</span>
            </Button>

            {/* Help */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHelpOpen(true)}
              className="h-8 w-8 p-0"
              aria-label="Help and Scientific Guardrails"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="h-8 w-8 p-0"
              aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Quick Help & Scientific Guardrails Modal */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Platform & Scientific Guardrails
            </DialogTitle>
            <DialogDescription className="text-xs pt-2 text-muted-foreground space-y-2">
              <p>
                <strong>Scientific Guardrails:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>
                  DEM analysis provides <em>static terrain susceptibility screening</em> based on morphological predisposition.
                </li>
                <li>
                  This output does <strong>NOT</strong> predict real-time flood timing, flood depth, or storm event forecasts.
                </li>
                <li>
                  NISAR L-band SAR observations provide physical inundation extent validation, not elevation mapping.
                </li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setHelpOpen(false);
                navigate("/methods");
              }}
            >
              Full Methodology Guide
            </Button>
            <Button size="sm" onClick={() => setHelpOpen(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
