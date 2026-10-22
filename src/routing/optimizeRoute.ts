import { hasCoords } from '../data/binMapper';
import type { Bin, Depot, RoutePlan, RouteStop } from '../types';
import { haversineMatrix, type CostMatrix } from './costMatrix';
import type { LatLng } from './distance';
import { osrmRoute, osrmTable, type FetchFn, type OsrmRoute } from './osrm';
import { nearestNeighbor, tourCost, twoOpt } from './tsp';

export interface OptimizeOptions {
  threshold: number;
  useRoadRouting: boolean;
  osrmUrl: string;
  fallbackSpeedKmh: number;
  serviceMinPerBin: number;
  fetchFn?: FetchFn;
  timeoutMs?: number;
}

/** Bins that must be collected: fill level ≥ threshold. */
export function selectFullBins(bins: Bin[], threshold: number): Bin[] {
  return bins.filter((b) => b.fillLevel >= threshold);
}

/**
 * Route optimizer pipeline:
 *  1. select bins with Fill Level ≥ threshold (bins without coordinates are reported, not routed)
 *  2. build a depot+bins cost matrix — OSRM road distances, or straight-line estimates if OSRM fails
 *  3. Nearest Neighbour tour from the depot
 *  4. 2-opt improvement
 *  5. road geometry + leg times for the final order (depot → bins → depot)
 */
export async function optimizeRoute(bins: Bin[], depot: Depot, opts: OptimizeOptions): Promise<RoutePlan> {
  const fetchFn: FetchFn = opts.fetchFn ?? ((input, init) => fetch(input, init));
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const warnings: string[] = [];

  const full = selectFullBins(bins, opts.threshold);
  const routable = full.filter(hasCoords);
  const skipped = full.filter((b) => !hasCoords(b));
  if (skipped.length) warnings.push(`${skipped.length} full bin(s) have no valid latitude/longitude and were not routed: ${skipped.map((b) => b.binId).join(', ')}`);

  const base: RoutePlan = {
    depot,
    stops: [],
    geometry: [],
    totalKm: 0,
    driveMin: 0,
    serviceMin: 0,
    totalMin: 0,
    returnLegKm: 0,
    source: opts.useRoadRouting ? 'road' : 'estimated',
    nearestNeighborKm: 0,
    optimizedMatrixKm: 0,
    improvementPct: 0,
    skipped,
    warnings,
    computedAt: Date.now(),
  };
  if (routable.length === 0) return base;

  const points: LatLng[] = [depot, ...routable.map((b) => ({ lat: b.lat, lng: b.lng }))];

  // 2. cost matrix
  let matrix: CostMatrix;
  if (opts.useRoadRouting) {
    try {
      matrix = await osrmTable(points, opts.osrmUrl, fetchFn, timeoutMs, opts.fallbackSpeedKmh);
    } catch (e) {
      warnings.push(`Road routing unavailable (${(e as Error).message}). Showing straight-line estimates.`);
      matrix = haversineMatrix(points, opts.fallbackSpeedKmh);
    }
  } else {
    matrix = haversineMatrix(points, opts.fallbackSpeedKmh);
  }

  // 3 + 4. Nearest Neighbour, then 2-opt — optimising total distance.
  const nnTour = nearestNeighbor(matrix.km);
  const tour = twoOpt(nnTour, matrix.km);
  const nnKm = tourCost(nnTour, matrix.km);
  const optKm = tourCost(tour, matrix.km);

  // 5. road geometry for the final order
  const ordered = tour.slice(1).map((idx) => routable[idx - 1]);
  const waypoints: LatLng[] = [depot, ...ordered.map((b) => ({ lat: b.lat, lng: b.lng })), depot];
  let road: OsrmRoute | null = null;
  if (matrix.source === 'road') {
    try {
      road = await osrmRoute(waypoints, opts.osrmUrl, fetchFn, timeoutMs);
    } catch (e) {
      warnings.push(`Could not load road geometry (${(e as Error).message}). Drawing straight segments.`);
    }
  }

  const legs = road?.legs.length === waypoints.length - 1
    ? road.legs
    : tour.map((from, i) => {
        const to = i + 1 < tour.length ? tour[i + 1] : 0;
        return { km: matrix.km[from][to], min: matrix.min[from][to] };
      });

  let elapsed = 0;
  const stops: RouteStop[] = ordered.map((bin, i) => {
    elapsed += legs[i].min + (i > 0 ? opts.serviceMinPerBin : 0);
    return {
      binId: bin.binId,
      address: bin.address,
      lat: bin.lat,
      lng: bin.lng,
      fillLevel: bin.fillLevel,
      legKm: legs[i].km,
      arrivalMin: elapsed,
    };
  });

  const driveMin = legs.reduce((s, l) => s + l.min, 0);
  const totalKm = legs.reduce((s, l) => s + l.km, 0);
  const serviceMin = ordered.length * opts.serviceMinPerBin;

  return {
    ...base,
    stops,
    geometry: road?.geometry ?? waypoints.map((p) => [p.lat, p.lng] as [number, number]),
    totalKm,
    driveMin,
    serviceMin,
    totalMin: driveMin + serviceMin,
    returnLegKm: legs[legs.length - 1].km,
    source: matrix.source,
    nearestNeighborKm: nnKm,
    optimizedMatrixKm: optKm,
    improvementPct: nnKm > 0 ? ((nnKm - optKm) / nnKm) * 100 : 0,
  };
}
