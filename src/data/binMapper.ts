import { CRITICAL_LEVEL } from '../config';
import type { Bin, BinLevel, Priority } from '../types';

type Row = Record<string, unknown>;

/** Read the first present key (supports "Bin ID", "bin_id", "BinID", …). */
function pick(row: Row, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return undefined;
}

/** Accepts 45, "45", "45%", " 45.5 % " → number, else NaN. */
export function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace('%', '').trim();
    return cleaned === '' ? NaN : Number(cleaned);
  }
  return NaN;
}

function parseCoord(value: unknown, limit: number): number | null {
  const n = parseNumber(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null;
  return n;
}

export function clampFill(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

/** Convert a raw Supabase `bins` row into a Bin. Returns null if it has no Bin ID. */
export function mapBinRow(row: Row): Bin | null {
  const binId = pick(row, 'Bin ID', 'bin_id', 'BinID', 'binId');
  if (binId === undefined) return null;

  let lat = parseCoord(pick(row, 'Latitude', 'latitude', 'lat'), 90);
  let lng = parseCoord(pick(row, 'Longitude', 'longitude', 'lng', 'lon'), 180);
  // 0,0 is almost always an unset sensor, not a real bin location.
  if (lat === 0 && lng === 0) lat = lng = null;
  if (lat === null || lng === null) lat = lng = null;

  const lastUpdated = pick(row, 'Last Updated', 'last_updated', 'updated_at', 'created_at');

  return {
    rowId: (pick(row, 'id') as number | string | undefined) ?? String(binId),
    binId: String(binId).trim(),
    address: String(pick(row, 'Address', 'address') ?? '—'),
    lat,
    lng,
    fillLevel: clampFill(parseNumber(pick(row, 'Fill Level', 'fill_level', 'fillLevel'))),
    rawStatus: String(pick(row, 'Status', 'status') ?? ''),
    lastUpdated: lastUpdated === undefined ? null : String(lastUpdated),
  };
}

export function binLevel(fill: number, threshold: number): BinLevel {
  if (fill >= Math.max(CRITICAL_LEVEL, threshold)) return 'Critical';
  if (fill >= threshold) return 'Full';
  return 'Normal';
}

export function binPriority(fill: number, threshold: number): Priority {
  const level = binLevel(fill, threshold);
  if (level === 'Critical') return 'Critical';
  if (level === 'Full') return 'High';
  if (fill >= threshold * 0.75) return 'Medium';
  return 'Low';
}

export function hasCoords(bin: Bin): bin is Bin & { lat: number; lng: number } {
  return bin.lat !== null && bin.lng !== null;
}

/** Sort by Bin ID with natural number ordering (BIN-2 before BIN-10). */
export function sortBins(bins: Bin[]): Bin[] {
  return [...bins].sort((a, b) => a.binId.localeCompare(b.binId, undefined, { numeric: true }));
}
