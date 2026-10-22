import type { Bin } from '../types';
import { clampFill } from './binMapper';

/** Pure helpers that simulate HC-SR04 readings for TEST MODE. */

function touch(bin: Bin, fillLevel: number, now: number): Bin {
  return { ...bin, fillLevel: clampFill(fillLevel), lastUpdated: new Date(now).toISOString() };
}

/** One "sensor tick": every non-full bin fills a little; occasionally a full bin is emptied. */
export function simulateTick(bins: Bin[], threshold: number, rand = Math.random, now = Date.now()): Bin[] {
  return bins.map((bin) => {
    if (bin.fillLevel >= threshold) {
      // ~8% chance per tick that the truck emptied this bin.
      return rand() < 0.08 ? touch(bin, 2 + rand() * 8, now) : bin;
    }
    const growth = 1 + rand() * 7; // 1–8 % per tick
    return touch(bin, bin.fillLevel + growth, now);
  });
}

export function setFill(bins: Bin[], binId: string, fillLevel: number, now = Date.now()): Bin[] {
  return bins.map((b) => (b.binId === binId ? touch(b, fillLevel, now) : b));
}

export function emptyAllFull(bins: Bin[], threshold: number, now = Date.now()): Bin[] {
  return bins.map((b) => (b.fillLevel >= threshold ? touch(b, 0, now) : b));
}
