import { runFloodSimulation } from "./engine.ts";
import type { FloodSimConfig } from "./types.ts";

export interface WorkerSimRequest {
  type: "RUN_SIMULATION";
  demBuffer: ArrayBuffer;
  rows: number;
  cols: number;
  config?: Partial<FloodSimConfig>;
}

export interface WorkerSimResponse {
  type: "SIMULATION_SUCCESS" | "SIMULATION_ERROR";
  result?: {
    rows: number;
    cols: number;
    timeStepsSeconds: number[];
    steps: Array<{
      timeSeconds: number;
      cellIndices: Uint32Array;
      depths: Float32Array;
    }>;
    route: any[];
    peakDepthGrid: Float32Array;
    arrivalTimeGrid: Float32Array;
    handGrid: Float32Array;
    flowAccumulationGrid: Int32Array;
  };
  error?: string;
  durationMs?: number;
}

self.onmessage = (e: MessageEvent<WorkerSimRequest>) => {
  const { type, demBuffer, rows, cols, config } = e.data;
  if (type === "RUN_SIMULATION") {
    const start = performance.now();
    try {
      const dem = new Float32Array(demBuffer);
      const simResult = runFloodSimulation(dem, rows, cols, config);
      const durationMs = performance.now() - start;

      const transferableList: Transferable[] = [
        simResult.peakDepthGrid.buffer,
        simResult.arrivalTimeGrid.buffer,
        simResult.handGrid.buffer,
        simResult.flowAccumulationGrid.buffer,
      ];

      for (const step of simResult.steps) {
        transferableList.push(step.cellIndices.buffer);
        transferableList.push(step.depths.buffer);
      }

      self.postMessage(
        {
          type: "SIMULATION_SUCCESS",
          result: {
            rows: simResult.rows,
            cols: simResult.cols,
            timeStepsSeconds: simResult.timeStepsSeconds,
            steps: simResult.steps,
            route: simResult.route,
            peakDepthGrid: simResult.peakDepthGrid,
            arrivalTimeGrid: simResult.arrivalTimeGrid,
            handGrid: simResult.handGrid,
            flowAccumulationGrid: simResult.flowAccumulationGrid,
          },
          durationMs,
        },
        transferableList
      );
    } catch (err: any) {
      self.postMessage({
        type: "SIMULATION_ERROR",
        error: err?.message || String(err),
      });
    }
  }
};
