import { describe, expect, it, vi } from 'vitest';
import type { Bin, Depot } from '../types';
import { haversineKm } from './distance';
import { optimizeRoute, selectFullBins } from './optimizeRoute';
import { nearestNeighbor, tourCost, twoOpt } from './tsp';

const depot: Depot = { name: 'Depot', lat: 17.4475, lng: 78.5268 };

function bin(binId: string, lat: number | null, lng: number | null, fillLevel: number): Bin {
  return { rowId: binId, binId, address: binId, lat, lng, fillLevel, rawStatus: '', lastUpdated: null };
}

const opts = { threshold: 90, useRoadRouting: false, osrmUrl: 'http://osrm.test', fallbackSpeedKmh: 30, serviceMinPerBin: 2 };

describe('haversine', () => {
  it('is ~111 km per degree of latitude', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
  });
});

describe('TSP heuristics', () => {
  // 4 points on a square; NN from 0 can be forced into a crossing tour by the matrix below.
  const pts = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
    [5, 1],
  ];
  const m = pts.map(([ax, ay]) => pts.map(([bx, by]) => Math.hypot(ax - bx, ay - by)));

  it('nearest neighbour visits every node exactly once starting at the depot', () => {
    const t = nearestNeighbor(m);
    expect(t[0]).toBe(0);
    expect([...t].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('2-opt never makes a tour worse and keeps the depot first', () => {
    const nn = nearestNeighbor(m);
    const opt = twoOpt(nn, m);
    expect(opt[0]).toBe(0);
    expect(tourCost(opt, m)).toBeLessThanOrEqual(tourCost(nn, m) + 1e-9);
    expect([...opt].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('2-opt removes a crossing', () => {
    const crossing = [0, 2, 1, 3, 4]; // edges 0-2 and 1-3 cross
    const opt = twoOpt(crossing, m);
    expect(tourCost(opt, m)).toBeLessThan(tourCost(crossing, m));
    // optimal perimeter-ish tour: 0-1-2-3-4-0 = 10+10+10+~5.1+~5.1
    expect(tourCost(opt, m)).toBeCloseTo(10 + 10 + 10 + Math.hypot(5, 1) * 2, 6);
  });

  it('2-opt matches brute force on random instances', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const permute = (arr: number[]): number[][] =>
      arr.length <= 1 ? [arr] : arr.flatMap((x, i) => permute([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
    let worseBy = 0;
    for (let trial = 0; trial < 20; trial++) {
      const p = Array.from({ length: 7 }, () => [rnd() * 100, rnd() * 100]);
      const mm = p.map(([ax, ay]) => p.map(([bx, by]) => Math.hypot(ax - bx, ay - by)));
      const best = Math.min(...permute([1, 2, 3, 4, 5, 6]).map((perm) => tourCost([0, ...perm], mm)));
      const got = tourCost(twoOpt(nearestNeighbor(mm), mm), mm);
      worseBy = Math.max(worseBy, got / best - 1);
    }
    // 2-opt is a heuristic; on small instances it should be within a few % of optimal
    expect(worseBy).toBeLessThan(0.1);
  });
});

describe('optimizeRoute', () => {
  const bins = [
    bin('BIN-001', 17.4489, 78.5199, 15),
    bin('BIN-002', 17.4428, 78.5332, 92),
    bin('BIN-003', 17.4583, 78.5243, 97),
    bin('BIN-004', 17.4641, 78.5352, 91),
    bin('BIN-005', null, null, 99),
    bin('BIN-006', 17.4742, 78.5381, 90),
  ];

  it('selects only bins at or above the threshold', () => {
    expect(selectFullBins(bins, 90).map((b) => b.binId)).toEqual(['BIN-002', 'BIN-003', 'BIN-004', 'BIN-005', 'BIN-006']);
  });

  it('builds a closed depot → bins → depot route with straight-line fallback', async () => {
    const plan = await optimizeRoute(bins, depot, opts);
    expect(plan.source).toBe('estimated');
    expect(plan.stops.map((s) => s.binId).sort()).toEqual(['BIN-002', 'BIN-003', 'BIN-004', 'BIN-006']);
    expect(plan.skipped.map((b) => b.binId)).toEqual(['BIN-005']);
    expect(plan.geometry[0]).toEqual([depot.lat, depot.lng]);
    expect(plan.geometry[plan.geometry.length - 1]).toEqual([depot.lat, depot.lng]);
    expect(plan.totalKm).toBeGreaterThan(0);
    expect(plan.totalMin).toBeCloseTo(plan.driveMin + 4 * 2, 6);
    expect(plan.optimizedMatrixKm).toBeLessThanOrEqual(plan.nearestNeighborKm + 1e-9);
    // arrival times increase along the route
    plan.stops.reduce((prev, s) => (expect(s.arrivalMin).toBeGreaterThan(prev), s.arrivalMin), 0);
  });

  it('returns an empty plan when nothing is full', async () => {
    const plan = await optimizeRoute([bin('A', 17.45, 78.52, 10)], depot, opts);
    expect(plan.stops).toHaveLength(0);
    expect(plan.totalKm).toBe(0);
  });

  it('falls back to estimates when OSRM fails', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'));
    const plan = await optimizeRoute(bins, depot, { ...opts, useRoadRouting: true, fetchFn });
    expect(plan.source).toBe('estimated');
    expect(plan.warnings.join(' ')).toMatch(/network down/);
    expect(plan.stops).toHaveLength(4);
  });

  it('uses OSRM table + route when available', async () => {
    const n = 5; // depot + 4 routable bins
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes('/table/')) {
        const distances = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Math.abs(i - j) * 1000));
        const durations = distances.map((r) => r.map((d) => d / 10));
        return new Response(JSON.stringify({ code: 'Ok', distances, durations }));
      }
      return new Response(
        JSON.stringify({
          code: 'Ok',
          routes: [{ distance: 8000, duration: 800, geometry: { coordinates: [[78.5, 17.4], [78.6, 17.5]] }, legs: Array.from({ length: n }, () => ({ distance: 1600, duration: 160 })) }],
        }),
      );
    });
    const plan = await optimizeRoute(bins, depot, { ...opts, useRoadRouting: true, fetchFn: fetchFn as never });
    expect(plan.source).toBe('road');
    expect(plan.totalKm).toBeCloseTo(8, 6);
    expect(plan.driveMin).toBeCloseTo(800 / 60, 6);
    expect(plan.geometry).toEqual([[17.4, 78.5], [17.5, 78.6]]);
    // OSRM wants lng,lat
    expect(fetchFn.mock.calls[0][0]).toContain('78.526800,17.447500');
  });
});
