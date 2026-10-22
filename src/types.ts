/** A bin normalised from the Supabase `bins` row (or from TEST MODE sample data). */
export interface Bin {
  /** Supabase primary key (`id`). Sample bins use a negative number. */
  rowId: number | string;
  binId: string;
  address: string;
  /** null when the row has no usable coordinates (it can't be routed). */
  lat: number | null;
  lng: number | null;
  /** 0–100, clamped. */
  fillLevel: number;
  /** Raw `Status` text as written by the sensor / database. */
  rawStatus: string;
  /** ISO timestamp from `Last Updated` (falls back to `created_at`). */
  lastUpdated: string | null;
}

export type BinLevel = 'Normal' | 'Full' | 'Critical';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type DataMode = 'test' | 'live';

export interface Depot {
  name: string;
  lat: number;
  lng: number;
}

export type ConnectionState = 'idle' | 'unconfigured' | 'connecting' | 'connected' | 'error' | 'offline';

export type AlertKind = 'full' | 'critical' | 'emptied' | 'info';

export interface BinAlert {
  id: string;
  binId: string;
  kind: AlertKind;
  message: string;
  fillLevel: number;
  at: number; // epoch ms
  read: boolean;
}

export interface RouteStop {
  binId: string;
  address: string;
  lat: number;
  lng: number;
  fillLevel: number;
  /** Distance of the leg that arrives at this stop (km). */
  legKm: number;
  /** Cumulative minutes from leaving the depot until arrival here (includes service at previous stops). */
  arrivalMin: number;
}

export type RouteSource = 'road' | 'estimated';

export interface RoutePlan {
  depot: Depot;
  stops: RouteStop[];
  /** Polyline [lat, lng] from depot → stops → depot. */
  geometry: [number, number][];
  totalKm: number;
  driveMin: number;
  serviceMin: number;
  totalMin: number;
  /** Return leg (last stop → depot). */
  returnLegKm: number;
  source: RouteSource;
  /** Distance of the Nearest-Neighbour tour before 2-opt (same metric). */
  nearestNeighborKm: number;
  /** Distance after 2-opt, using the same matrix (for a fair comparison). */
  optimizedMatrixKm: number;
  improvementPct: number;
  /** Full bins that could not be routed (missing coordinates). */
  skipped: Bin[];
  warnings: string[];
  computedAt: number;
}
