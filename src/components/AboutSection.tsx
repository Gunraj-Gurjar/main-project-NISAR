import { motion } from "framer-motion";

const AboutSection = () => {
  return (
    <section className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text">Mission Architecture & Science Guardrails</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Understanding the complementary roles of Digital Elevation Models (DEMs) for terrain screening and Synthetic Aperture Radar (SAR) for flood extent validation.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="glass-card rounded-3xl p-8 md:p-12 border border-white/10 relative overflow-hidden w-full space-y-8"
      >
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-neon-blue/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-neon-purple/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10 space-y-8">
          <div>
            <h3 className="text-2xl font-semibold mb-3 text-foreground/90 flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-blue" />
              NISAR L-Band SAR: Validation, Not DEM
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base">
              The NASA-ISRO Synthetic Aperture Radar (NISAR) provides repeat-pass L-band SAR observations distributed via Alaska Satellite Facility (ASF) DAAC. <strong className="text-foreground">NISAR does not provide elevation data or DEMs.</strong> In this platform, NISAR L-band and Sentinel-1 C-band SAR observations serve exclusively as independent ground-truth sources to derive inundation extents for validating terrain-based screening susceptibility outputs.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-3 text-foreground/90 flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
              DEM Input Scope & Limitations
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base">
              Digital Elevation Models (e.g., Copernicus GLO-30, SRTM, CartoDEM) provide static surface topography. Users should note key physical limitations:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Digital Surface Models (DSMs) capture tree canopies and building structures rather than bare ground.</li>
              <li>Vertical accuracy typically has several metres of uncertainty depending on slope and vegetation.</li>
              <li>A ~30 m grid cell size cannot resolve local drainage ditches, embankments, retaining walls, or storm culverts.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-3 text-foreground/90 flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
              Terrain Predisposition vs Event Probability
            </h3>
            <p className="text-muted-foreground leading-relaxed text-base">
              Terrain-based screening evaluates morphological predisposition (low elevation, concave curvatures, high flow accumulation, low slope). It does <strong className="text-foreground">not</strong> compute real-time hydrodynamic flood forecasts, inundation depth, arrival timing, or event probability.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-foreground/90">
            <span className="font-semibold text-destructive block mb-1">Mandatory Institutional Advisory Notice:</span>
            Advisory: terrain-based screening. Not an official warning. Consult IMD, CWC, NDMA or your State Disaster Management Authority (SDMA) for official flood forecasts and warnings.
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default AboutSection;
