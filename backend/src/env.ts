import type { Depot } from '../../src/types';

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback;
}

/** "BIN-001:secret1,BIN-002:secret2" -> Map(binId -> secret). */
export function parseDeviceKeys(raw: string | undefined): Map<string, string> {
  const keys = new Map<string, string>();
  for (const part of (raw ?? '').split(',')) {
    const idx = part.lastIndexOf(':');
    if (idx <= 0) continue;
    const binId = part.slice(0, idx).trim();
    const secret = part.slice(idx + 1).trim();
    if (binId && secret) keys.set(binId, secret);
  }
  return keys;
}

export interface AppConfig {
  port: number;
  supabaseUrl: string;
  /** Server-side only. Never sent to the browser or the ESP32. */
  supabaseSecretKey: string;
  deviceKeys: Map<string, string>;
  corsOrigins: string[];
  fillThreshold: number;
  depot: Depot;
  osrmUrl: string;
  fallbackSpeedKmh: number;
  serviceMinPerBin: number;
  /** Minimum seconds between two readings from the same bin. */
  minReadingIntervalSec: number;
  /** Git commit being served (Render sets RENDER_GIT_COMMIT), shown on /health. */
  commit: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: num(env.PORT, 8080),
    supabaseUrl: (env.SUPABASE_URL ?? '').trim(),
    supabaseSecretKey: (env.SUPABASE_SECRET_KEY ?? '').trim(),
    deviceKeys: parseDeviceKeys(env.DEVICE_KEYS),
    corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    fillThreshold: num(env.FILL_THRESHOLD, 90),
    depot: {
      name: env.DEPOT_NAME || 'Malkajgiri, Hyderabad',
      lat: num(env.DEPOT_LAT, 17.4475),
      lng: num(env.DEPOT_LNG, 78.5268),
    },
    osrmUrl: (env.OSRM_URL || 'https://router.project-osrm.org').replace(/\/+$/, ''),
    fallbackSpeedKmh: num(env.FALLBACK_SPEED_KMH, 25),
    serviceMinPerBin: num(env.SERVICE_MIN_PER_BIN, 2),
    minReadingIntervalSec: num(env.MIN_READING_INTERVAL_SEC, 2),
    commit: (env.RENDER_GIT_COMMIT ?? '').slice(0, 7) || 'local',
  };
}
