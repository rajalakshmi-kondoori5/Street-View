import type { Bin } from '../types';

/**
 * TEST MODE ONLY. Sample bins around Malkajgiri, Hyderabad, so the dashboard and route
 * optimizer can be exercised before the ESP32 is connected. LIVE MODE never uses this list.
 */
const SAMPLE: Omit<Bin, 'lastUpdated' | 'rawStatus'>[] = [
  { rowId: -1, binId: 'BIN-001', address: 'Malkajgiri Railway Station Rd', lat: 17.4489, lng: 78.5199, fillLevel: 15 },
  { rowId: -2, binId: 'BIN-002', address: 'Anandbagh Main Rd', lat: 17.4428, lng: 78.5332, fillLevel: 92 },
  { rowId: -3, binId: 'BIN-003', address: 'Vinayak Nagar', lat: 17.4583, lng: 78.5243, fillLevel: 97 },
  { rowId: -4, binId: 'BIN-004', address: 'Safilguda Lake Rd', lat: 17.4641, lng: 78.5352, fillLevel: 91 },
  { rowId: -5, binId: 'BIN-005', address: 'Moula Ali Kaman', lat: 17.4609, lng: 78.5552, fillLevel: 40 },
  { rowId: -6, binId: 'BIN-006', address: 'Neredmet X Roads', lat: 17.4742, lng: 78.5381, fillLevel: 68 },
  { rowId: -7, binId: 'BIN-007', address: 'East Anandbagh', lat: 17.4397, lng: 78.5421, fillLevel: 94 },
  { rowId: -8, binId: 'BIN-008', address: 'Saket Colony', lat: 17.4801, lng: 78.5498, fillLevel: 55 },
];

export function createSampleBins(now = Date.now()): Bin[] {
  return SAMPLE.map((b, i) => ({
    ...b,
    rawStatus: 'Simulated',
    lastUpdated: new Date(now - (i + 1) * 7 * 60_000).toISOString(),
  }));
}
