import { ROAD_DETOUR_FACTOR, type CostMatrix } from './costMatrix';
import { haversineKm, type LatLng } from './distance';

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/** The public OSRM demo server rejects tables larger than this. */
export const OSRM_MAX_TABLE_POINTS = 100;

function coordList(points: LatLng[]): string {
  // OSRM expects lng,lat
  return points.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
}

async function getJson(url: string, fetchFn: FetchFn, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const body = await res.json();
    if (body.code !== 'Ok') throw new Error(`OSRM ${body.code}: ${body.message ?? 'request failed'}`);
    return body;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error(`OSRM timed out after ${timeoutMs / 1000}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Road distance/duration matrix from OSRM's /table service. */
export async function osrmTable(points: LatLng[], baseUrl: string, fetchFn: FetchFn, timeoutMs = 10_000, fallbackSpeedKmh = 25): Promise<CostMatrix> {
  if (points.length > OSRM_MAX_TABLE_POINTS) throw new Error(`Too many points for OSRM table (${points.length})`);
  const url = `${baseUrl}/table/v1/driving/${coordList(points)}?annotations=distance,duration`;
  const body = await getJson(url, fetchFn, timeoutMs);
  const distances: (number | null)[][] = body.distances;
  const durations: (number | null)[][] = body.durations;
  if (!Array.isArray(distances) || !Array.isArray(durations)) throw new Error('OSRM table response missing distances');

  // A null cell means OSRM found no road between two points: fill that one cell with an estimate.
  const km = distances.map((row, i) =>
    row.map((m, j) => (m == null ? haversineKm(points[i], points[j]) * ROAD_DETOUR_FACTOR : m / 1000)),
  );
  const min = durations.map((row, i) => row.map((s, j) => (s == null ? (km[i][j] / fallbackSpeedKmh) * 60 : s / 60)));
  return { km, min, source: 'road' };
}

export interface OsrmRoute {
  geometry: [number, number][]; // [lat, lng]
  legs: { km: number; min: number }[];
  km: number;
  min: number;
}

/** Road geometry + per-leg distance/time for an ordered list of waypoints (via /route). */
export async function osrmRoute(waypoints: LatLng[], baseUrl: string, fetchFn: FetchFn, timeoutMs = 10_000): Promise<OsrmRoute> {
  const url = `${baseUrl}/route/v1/driving/${coordList(waypoints)}?overview=full&geometries=geojson&steps=false`;
  const body = await getJson(url, fetchFn, timeoutMs);
  const route = body.routes?.[0];
  if (!route) throw new Error('OSRM returned no route');
  return {
    geometry: (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
    legs: (route.legs as { distance: number; duration: number }[]).map((l) => ({ km: l.distance / 1000, min: l.duration / 60 })),
    km: route.distance / 1000,
    min: route.duration / 60,
  };
}
