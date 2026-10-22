import type { DataMode, Depot } from './types';

const env = import.meta.env;

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback;
}

export const config = {
  supabaseUrl: (env.VITE_SUPABASE_URL ?? '').trim(),
  // the .env.example placeholder counts as "not configured"
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY ?? '').trim().replace(/^your-.*/, ''),
  defaultMode: (env.VITE_DATA_MODE === 'live' ? 'live' : 'test') as DataMode,
  fillThreshold: num(env.VITE_FILL_THRESHOLD, 90),
  depot: {
    name: env.VITE_DEPOT_NAME || 'Malkajgiri, Hyderabad',
    lat: num(env.VITE_DEPOT_LAT, 17.4475),
    lng: num(env.VITE_DEPOT_LNG, 78.5268),
  } satisfies Depot,
  osrmUrl: (env.VITE_OSRM_URL || 'https://router.project-osrm.org').replace(/\/+$/, ''),
  fallbackSpeedKmh: num(env.VITE_FALLBACK_SPEED_KMH, 25),
  serviceMinPerBin: num(env.VITE_SERVICE_MIN_PER_BIN, 2),
};

export { CRITICAL_LEVEL } from './constants';

/** Selectable depot presets. The .env depot is always the first entry. */
export const DEPOT_PRESETS: Depot[] = dedupe([
  config.depot,
  { name: 'Malkajgiri, Hyderabad', lat: 17.4475, lng: 78.5268 },
  { name: 'Secunderabad, Hyderabad', lat: 17.4399, lng: 78.4983 },
  { name: 'Uppal, Hyderabad', lat: 17.4058, lng: 78.5591 },
  { name: 'MLRIT, Dundigal', lat: 17.5946, lng: 78.4429 },
]);

function dedupe(list: Depot[]): Depot[] {
  const seen = new Set<string>();
  return list.filter((d) => (seen.has(d.name) ? false : (seen.add(d.name), true)));
}

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
