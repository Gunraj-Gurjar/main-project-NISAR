import React from "react";
import { InfoTooltip } from "./InfoTooltip";
import { cn } from "@/lib/utils";

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  tooltip?: string;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  tooltip,
  className,
}) => {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border mb-4", className)}>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
            {badge}
            {tooltip && <InfoTooltip content={tooltip} ariaLabel={`Info about ${title}`} />}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};
