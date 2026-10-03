import { fromArrayBuffer } from "geotiff";

export async function processGeoTiff(file: File): Promise<number[][]> {
  const buffer = await file.arrayBuffer();
  const tiff = await fromArrayBuffer(buffer);
  const image = await tiff.getImage();
  const data = await image.readRasters();
  const width = image.getWidth();
  const height = image.getHeight();
  const raster = data[0] as Float32Array | Float64Array | Int16Array | Uint16Array;

  // Convert to 2D array and clean invalid values
  const grid: number[][] = [];
  for (let i = 0; i < height; i++) {
    const row: number[] = [];
    for (let j = 0; j < width; j++) {
      let val = raster[i * width + j];
      if (!isFinite(val) || val < -500 || val > 9000) val = 0;
      row.push(val);
    }
    grid.push(row);
  }

  // Downsample to max 200x200
  return downsample(grid, 200);
}

export function generateDemoTerrain(): number[][] {
  const size = 150;
  const grid: number[][] = [];

  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    for (let j = 0; j < size; j++) {
      const x = (i / size) * 4 * Math.PI;
      const y = (j / size) * 4 * Math.PI;

      // Create mountain-like terrain
      let elevation = 0;
      elevation += 3000 * Math.exp(-((i - size * 0.5) ** 2 + (j - size * 0.4) ** 2) / (size * 15));
      elevation += 2500 * Math.exp(-((i - size * 0.3) ** 2 + (j - size * 0.7) ** 2) / (size * 12));
      elevation += 1800 * Math.exp(-((i - size * 0.7) ** 2 + (j - size * 0.6) ** 2) / (size * 10));
      elevation += 400 * Math.sin(x * 1.5) * Math.cos(y * 1.2);
      elevation += 200 * Math.sin(x * 3) * Math.sin(y * 2.5);
      elevation += 100 * (Math.random() - 0.5); // noise
      elevation = Math.max(0, elevation);

      row.push(elevation);
    }
    grid.push(row);
  }

  return grid;
}

function downsample(grid: number[][], maxSize: number): number[][] {
  const rows = grid.length;
  const cols = grid[0].length;

  if (rows <= maxSize && cols <= maxSize) return grid;

  const scale = Math.max(rows, cols) / maxSize;
  const newRows = Math.floor(rows / scale);
  const newCols = Math.floor(cols / scale);
  const result: number[][] = [];

  for (let i = 0; i < newRows; i++) {
    const row: number[] = [];
    for (let j = 0; j < newCols; j++) {
      const si = Math.floor(i * scale);
      const sj = Math.floor(j * scale);
      row.push(grid[si][sj]);
    }
    result.push(row);
  }

  return result;
}
