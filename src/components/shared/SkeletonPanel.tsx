import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonPanelProps {
  rows?: number;
  height?: string;
  className?: string;
}

export const SkeletonPanel: React.FC<SkeletonPanelProps> = ({
  rows = 4,
  height = "h-48",
  className,
}) => {
  return (
    <div className={cn("p-4 rounded-xl border border-border bg-card space-y-4", className)}>
      <Skeleton className="h-6 w-1/3 rounded-md" />
      <Skeleton className={cn("w-full rounded-lg", height)} />
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <Skeleton key={idx} className="h-4 w-full rounded-sm" style={{ width: `${100 - idx * 15}%` }} />
        ))}
      </div>
    </div>
  );
};
