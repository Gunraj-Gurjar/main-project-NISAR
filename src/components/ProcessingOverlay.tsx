import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const steps = [
  "Ingesting DEM raster...",
  "Cleaning nodata & validating vertical bounds...",
  "Extracting slope, aspect & curvature...",
  "Deriving Topographic Wetness Index (TWI) proxy...",
  "Evaluating explainable susceptibility factors...",
  "Generating multi-criteria screening layers...",
  "Finalizing 3D terrain & factor explorer...",
];

const ProcessingOverlay = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl"
    >
      <div className="text-center max-w-md px-4">
        {/* Spinning orb */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-neon-blue/20 animate-spin" style={{ animationDuration: "3s" }} />
          <div className="absolute inset-2 rounded-full border-2 border-neon-purple/30 animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
          <div className="absolute inset-4 rounded-full border-2 border-neon-cyan/20 animate-spin" style={{ animationDuration: "4s" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple animate-pulse" />
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-2 gradient-text">Processing Terrain</h3>
        <p className="text-sm text-muted-foreground font-mono mb-6">{steps[step]}</p>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-neon-blue to-neon-purple"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono">{Math.round(progress)}%</p>
      </div>
    </motion.div>
  );
};

export default ProcessingOverlay;
