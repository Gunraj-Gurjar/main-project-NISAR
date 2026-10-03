import React from "react";
import { InfoTooltip } from "./InfoTooltip";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tooltip?: string;
  badge?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  tooltip,
  badge,
  className,
}) => {
  return (
    <div className={cn("p-4 rounded-xl border border-border bg-card shadow-sm space-y-2", className)}>
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>{title}</span>
          {tooltip && <InfoTooltip content={tooltip} ariaLabel={`Information about ${title}`} />}
        </div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold font-numeric tabular-nums text-foreground tracking-tight">
          {value}
        </div>
        {badge}
      </div>

      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
};
