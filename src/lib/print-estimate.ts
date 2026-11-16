export const PRINTER_HOURLY_RATE = 5;
export const MAX_GCODE_BYTES = 50 * 1024 * 1024;

/** Printer operation only; excludes filament, labor, tax and shipping. */
export function calcPrinterRunningCost(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Enter a valid print duration.');
  return Math.round(seconds / 3600 * PRINTER_HOURLY_RATE * 100) / 100;
}

function durationSeconds(text: string): number | undefined {
  const units = [...text.matchAll(/(\d+(?:\.\d+)?)\s*([dhms])/gi)];
  if (!units.length) return undefined;
  const factors: Record<string, number> = { d: 86400, h: 3600, m: 60, s: 1 };
  const total = units.reduce((sum, match) => sum + Number(match[1]) * (factors[match[2]?.toLowerCase() ?? ''] ?? 0), 0);
  return total > 0 && Number.isFinite(total) ? Math.ceil(total) : undefined;
}

/** Read slicer's metadata, never execute uploaded G-code or approximate unsliced geometry. */
export function parseElegooEstimate(text: string): { grams: number; seconds: number } {
  const total = text.match(/^;\s*total filament used \[g\]\s*=\s*(\d+(?:\.\d+)?)/mi);
  const perFilament = text.match(/^;\s*filament used \[g\]\s*=\s*([\d., \t]+)/mi);
  const grams = total ? Number(total[1]) : perFilament?.[1]?.split(',').reduce((sum, value) => sum + Number(value.trim()), 0);
  const time = text.match(/^;[^\r\n]*total estimated time:\s*([^\r\n]+)/mi)?.[1]
    ?? text.match(/^;\s*estimated printing time \(normal mode\)\s*=\s*([^\r\n]+)/mi)?.[1];
  const seconds = time ? durationSeconds(time) : undefined;
  if (grams === undefined || !Number.isFinite(grams) || grams <= 0 || seconds === undefined) {
    throw new Error('No complete filament and time estimate found. Export a sliced .gcode file from Elegoo Slicer, or enter its estimates manually.');
  }
  return { grams: Math.ceil(grams), seconds };
}