import { motion } from "framer-motion";

const Navbar = ({ onNavClick }: { onNavClick?: (view: string) => void }) => (
  <motion.nav
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
  >
    <div className="glass-card max-w-5xl mx-auto flex items-center justify-between px-6 py-3 rounded-2xl">
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => onNavClick?.("hero")}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-sm font-bold">
          TH
        </div>
        <span className="font-bold text-lg tracking-tight">
          TerrainHazard<span className="text-neon-blue">Screen</span>
        </span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <button onClick={() => onNavClick?.("hero")} className="text-foreground/80 hover:text-neon-blue transition-colors">Home</button>
        <button onClick={() => onNavClick?.("applications")} className="text-foreground/80 hover:text-neon-blue transition-colors">Applications</button>
        <button onClick={() => onNavClick?.("about")} className="text-foreground/80 hover:text-neon-blue transition-colors">Mission & SAR Validation</button>
      </div>

      <span className="text-xs text-muted-foreground font-mono hidden sm:block">v1.0 · Terrain Susceptibility Screening</span>
    </div>
  </motion.nav>
);

export default Navbar;
