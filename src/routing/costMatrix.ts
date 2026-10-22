import type { RouteSource } from '../types';
import { haversineKm, type LatLng } from './distance';

/** km[i][j] / min[i][j] = cost of driving from point i to point j. Index 0 is the depot. */
export interface CostMatrix {
  km: number[][];
  min: number[][];
  source: RouteSource;
}

/**
 * Straight-line streets are never straight: multiply by a typical urban detour factor so the
 * fallback estimate is closer to real road distance. Clearly labelled "estimated" in the UI.
 */
export const ROAD_DETOUR_FACTOR = 1.3;

export function haversineMatrix(points: LatLng[], speedKmh: number): CostMatrix {
  const km = points.map((a) => points.map((b) => haversineKm(a, b) * ROAD_DETOUR_FACTOR));
  const min = km.map((row) => row.map((d) => (d / speedKmh) * 60));
  return { km, min, source: 'estimated' };
}
