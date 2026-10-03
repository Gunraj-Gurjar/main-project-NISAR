import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";

interface UploadSectionProps {
  onFileSelect: (file: File) => void;
  onDemoSelect: () => void;
  isProcessing: boolean;
}

const UploadSection = ({ onFileSelect, onDemoSelect, isProcessing }: UploadSectionProps) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/tiff": [".tif", ".tiff"] },
    maxFiles: 1,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-10 max-w-2xl mx-auto px-4"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Upload Terrain Data</span>
        </h2>
        <p className="text-muted-foreground">Drop a GeoTIFF DEM file or try a demo dataset</p>
      </div>

      <div
        {...getRootProps()}
        className={`glass-card gradient-border p-12 text-center cursor-pointer transition-all duration-300 hover:scale-[1.01] ${
          dragActive ? "neon-glow-blue scale-[1.02]" : ""
        }`}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg className="w-16 h-16 mx-auto mb-4 text-neon-blue/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </motion.div>
        <p className="text-foreground font-medium mb-1">Drag & drop your .tif DEM file</p>
        <p className="text-sm text-muted-foreground">or click to browse</p>
      </div>

      <div className="mt-6 text-center">
        <div className="flex items-center gap-4 justify-center mb-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <button
          onClick={onDemoSelect}
          disabled={isProcessing}
          className="glass-card px-6 py-3 rounded-xl text-sm font-medium text-neon-cyan hover:neon-glow-blue transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
        >
          🏔️ Load Himalaya Demo Terrain
        </button>
      </div>
    </motion.section>
  );
};

export default UploadSection;
