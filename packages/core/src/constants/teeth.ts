/**
 * Tooth charting constants. We store everything canonically in the FDI
 * (ISO 3950) two-digit system internally and render Universal/Palmer per locale.
 * FDI is the default display system for Mauritius.
 */

// FDI permanent dentition, quadrant 1–4, teeth 1–8.
export const PERMANENT_TEETH_FDI: readonly number[] = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, // upper R→L
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38, // lower R→L
] as const;

// FDI primary (deciduous) dentition, quadrant 5–8, teeth 1–5.
export const PRIMARY_TEETH_FDI: readonly number[] = [
  55, 54, 53, 52, 51, 61, 62, 63, 64, 65, // upper
  85, 84, 83, 82, 81, 71, 72, 73, 74, 75, // lower
] as const;

export const ALL_TEETH_FDI: readonly number[] = [...PERMANENT_TEETH_FDI, ...PRIMARY_TEETH_FDI];

/** Tooth surfaces. M/D/B/L/P always; O for posterior, I for anterior. */
export const TOOTH_SURFACES = ["M", "O", "I", "D", "B", "L", "P"] as const;
export type ToothSurface = (typeof TOOTH_SURFACES)[number];

export const NUMBERING_SYSTEMS = ["fdi", "universal", "palmer"] as const;
export type NumberingSystem = (typeof NUMBERING_SYSTEMS)[number];
export const DEFAULT_NUMBERING_SYSTEM: NumberingSystem = "fdi";

export function isPrimaryTooth(fdi: number): boolean {
  const quadrant = Math.floor(fdi / 10);
  return quadrant >= 5 && quadrant <= 8;
}

export function toothQuadrant(fdi: number): number {
  return Math.floor(fdi / 10);
}

export function isUpperTooth(fdi: number): boolean {
  const q = toothQuadrant(fdi);
  return q === 1 || q === 2 || q === 5 || q === 6;
}

/** Anterior teeth (incisors/canines, positions 1–3) use the incisal surface. */
export function isAnteriorTooth(fdi: number): boolean {
  const position = fdi % 10;
  return position >= 1 && position <= 3;
}

/** Valid surfaces for a given tooth (anterior gets I, posterior gets O). */
export function surfacesForTooth(fdi: number): ToothSurface[] {
  const anterior = isAnteriorTooth(fdi);
  const base: ToothSurface[] = ["M", "D", "B"];
  base.push(isUpperTooth(fdi) ? "P" : "L");
  base.push(anterior ? "I" : "O");
  return base;
}

// FDI → Universal (1–32 permanent, A–T primary) for display conversion.
const FDI_TO_UNIVERSAL: Record<number, string> = {
  18: "1", 17: "2", 16: "3", 15: "4", 14: "5", 13: "6", 12: "7", 11: "8",
  21: "9", 22: "10", 23: "11", 24: "12", 25: "13", 26: "14", 27: "15", 28: "16",
  38: "17", 37: "18", 36: "19", 35: "20", 34: "21", 33: "22", 32: "23", 31: "24",
  41: "25", 42: "26", 43: "27", 44: "28", 45: "29", 46: "30", 47: "31", 48: "32",
  55: "A", 54: "B", 53: "C", 52: "D", 51: "E", 61: "F", 62: "G", 63: "H", 64: "I", 65: "J",
  75: "K", 74: "L", 73: "M", 72: "N", 71: "O", 81: "P", 82: "Q", 83: "R", 84: "S", 85: "T",
};

export function fdiToUniversal(fdi: number): string {
  return FDI_TO_UNIVERSAL[fdi] ?? String(fdi);
}

/** Palmer is FDI position with a quadrant bracket; we render the position digit. */
export function fdiToPalmer(fdi: number): string {
  return String(fdi % 10);
}

export function renderToothLabel(fdi: number, system: NumberingSystem): string {
  switch (system) {
    case "universal":
      return fdiToUniversal(fdi);
    case "palmer":
      return fdiToPalmer(fdi);
    case "fdi":
    default:
      return String(fdi);
  }
}
