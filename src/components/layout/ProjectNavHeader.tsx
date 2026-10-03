import React from "react";
import { NavLink, useParams } from "react-router-dom";
import { LayoutDashboard, ShieldCheck, CloudRain, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/context/ProjectContext";
import { StatusChip } from "@/components/shared/StatusChip";

export const ProjectNavHeader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeProject, getProjectById } = useProject();

  const project = (id ? getProjectById(id) : null) || activeProject;
  const projectId = project?.id || id || "demo-job";

  const navItems = [
    {
      to: `/project/${projectId}`,
      end: true,
      label: "Workspace & Terrain",
      icon: LayoutDashboard,
    },
    {
      to: `/project/${projectId}/validation`,
      end: false,
      label: "SAR Validation",
      icon: ShieldCheck,
    },
    {
      to: `/project/${projectId}/advisories`,
      end: false,
      label: "Rainfall Advisories",
      icon: CloudRain,
    },
    {
      to: `/project/${projectId}/report`,
      end: false,
      label: "Report & Export",
      icon: FileText,
    },
  ];

  return (
    <div className="w-full bg-card border-b border-border py-3 px-4 md:px-6 mb-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <span>{project?.name || `Project ${projectId}`}</span>
            </h1>
            <p className="text-xs text-muted-foreground font-numeric tabular-nums">
              ID: {projectId} • CRS: {project?.jobData?.metadata?.crs || "EPSG:4326"}
            </p>
          </div>
          {project && <StatusChip status={project.status} />}
        </div>

        {/* Tab Navigation */}
        <nav aria-label="Project Sub-navigation" className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )
              }
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};
