import { CRITICAL_LEVEL } from '../constants';
import type { Bin, BinAlert, AlertKind } from '../types';

let seq = 0;
function make(bin: Bin, kind: AlertKind, message: string, now: number): BinAlert {
  return { id: `${now}-${++seq}`, binId: bin.binId, kind, message, fillLevel: bin.fillLevel, at: now, read: false };
}

const pct = (n: number) => `${Math.round(n)}%`;

/**
 * Compare the previous fill levels with the new bin list and return alerts only for
 * threshold *crossings*, so a full bin does not re-alert on every sensor reading.
 * `prev === null` means this is the first load: every bin already full raises one alert.
 */
export function diffAlerts(prev: Map<string, number> | null, bins: Bin[], threshold: number, now = Date.now()): BinAlert[] {
  const critical = Math.max(CRITICAL_LEVEL, threshold);
  const out: BinAlert[] = [];

  for (const bin of bins) {
    const before = prev?.get(bin.binId);
    const fill = bin.fillLevel;

    if (before === undefined) {
      // first time we see this bin
      if (fill >= critical) out.push(make(bin, 'critical', `${bin.binId} has reached ${pct(fill)} (Critical)`, now));
      else if (fill >= threshold) out.push(make(bin, 'full', `${bin.binId} is ready for collection (${pct(fill)})`, now));
      continue;
    }

    if (before < critical && fill >= critical) {
      out.push(make(bin, 'critical', `${bin.binId} has reached ${pct(fill)} (Critical)`, now));
    } else if (before < threshold && fill >= threshold) {
      out.push(make(bin, 'full', `${bin.binId} is ready for collection (${pct(fill)})`, now));
    } else if (before >= threshold && fill < threshold) {
      out.push(make(bin, 'emptied', `${bin.binId} has been emptied (${pct(fill)})`, now));
    }
  }
  return out;
}

export function snapshot(bins: Bin[]): Map<string, number> {
  return new Map(bins.map((b) => [b.binId, b.fillLevel]));
}
