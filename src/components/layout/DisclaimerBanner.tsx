import React from "react";
import { AlertCircle } from "lucide-react";

export const DisclaimerBanner: React.FC = () => {
  return (
    <div
      role="region"
      aria-label="Scientific Disclaimer Banner"
      className="w-full bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs py-1.5 px-4 flex items-center justify-center gap-2 font-medium shrink-0"
    >
      <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
      <span className="text-center">
        Terrain-based flood susceptibility screening. Not a flood prediction or official warning.
      </span>
    </div>
  );
};
