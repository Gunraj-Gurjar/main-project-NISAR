import React from "react";
import { cn } from "@/lib/utils";

export type StatusType = "ready" | "done" | "running" | "processing" | "queued" | "failed" | "warning";

interface StatusChipProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label, className }) => {
  const getStatusConfig = (st: StatusType) => {
    switch (st) {
      case "ready":
      case "done":
        return {
          bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
          dot: "bg-emerald-500",
          defaultLabel: "Ready",
        };
      case "running":
      case "processing":
        return {
          bg: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
          dot: "bg-sky-500 animate-pulse",
          defaultLabel: "Processing",
        };
      case "queued":
        return {
          bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
          dot: "bg-amber-500",
          defaultLabel: "Queued",
        };
      case "failed":
        return {
          bg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
          dot: "bg-rose-500",
          defaultLabel: "Failed",
        };
      case "warning":
        return {
          bg: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
          dot: "bg-amber-500",
          defaultLabel: "Advisory Active",
        };
      default:
        return {
          bg: "bg-muted text-muted-foreground border-border",
          dot: "bg-muted-foreground",
          defaultLabel: String(st),
        };
    }
  };

  const config = getStatusConfig(status);
  const text = label || config.defaultLabel;

  return (
    <span
      role="status"
      aria-label={`Status: ${text}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        config.bg,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
};
