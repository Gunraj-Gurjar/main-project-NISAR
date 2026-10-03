import React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  ariaLabel?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  children,
  side = "top",
  className,
  ariaLabel = "More information",
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded focus-visible:ring-1 focus-visible:ring-ring",
            className
          )}
        >
          {children || <Info className="h-4 w-4 shrink-0" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
};
