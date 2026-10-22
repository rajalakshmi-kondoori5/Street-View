import { describe, expect, it } from 'vitest';
import { diffAlerts, snapshot } from './alerts';
import { binLevel, binPriority, mapBinRow } from './binMapper';
import { applyChange } from './liveSource';
import { createSampleBins } from './sampleBins';
import { emptyAllFull, setFill, simulateTick } from './testSource';

describe('mapBinRow', () => {
  it('maps the Supabase column names (with spaces)', () => {
    const bin = mapBinRow({
      id: 1,
      created_at: '2026-10-01T00:00:00Z',
      'Bin ID': 'BIN-001',
      Address: 'Malkajgiri',
      Latitude: 17.45,
      Longitude: '78.52',
      'Fill Level': '45%',
      Status: 'Normal',
      'Last Updated': '2026-10-07T10:00:00Z',
    });
    expect(bin).toEqual({
      rowId: 1,
      binId: 'BIN-001',
      address: 'Malkajgiri',
      lat: 17.45,
      lng: 78.52,
      fillLevel: 45,
      rawStatus: 'Normal',
      lastUpdated: '2026-10-07T10:00:00Z',
    });
  });

  it('treats missing / zero / invalid coordinates as unroutable and clamps fill', () => {
    expect(mapBinRow({ id: 2, 'Bin ID': 'X', 'Fill Level': 140 })).toMatchObject({ lat: null, lng: null, fillLevel: 100 });
    expect(mapBinRow({ id: 3, 'Bin ID': 'Y', Latitude: 0, Longitude: 0, 'Fill Level': -5 })).toMatchObject({ lat: null, fillLevel: 0 });
    expect(mapBinRow({ id: 4, 'Bin ID': 'Z', Latitude: 200, Longitude: 78 })).toMatchObject({ lat: null, lng: null });
    expect(mapBinRow({ id: 5 })).toBeNull();
  });

  it('classifies levels and priority', () => {
    expect(binLevel(89.9, 90)).toBe('Normal');
    expect(binLevel(90, 90)).toBe('Full');
    expect(binLevel(97, 90)).toBe('Critical');
    expect(binPriority(15, 90)).toBe('Low');
    expect(binPriority(70, 90)).toBe('Medium');
    expect(binPriority(92, 90)).toBe('High');
    expect(binPriority(99, 90)).toBe('Critical');
  });
});

describe('alerts', () => {
  const bins = createSampleBins(0);

  it('first load alerts once per bin already full', () => {
    const a = diffAlerts(null, bins, 90, 0);
    expect(a.map((x) => x.binId).sort()).toEqual(['BIN-002', 'BIN-003', 'BIN-004', 'BIN-007']);
    expect(a.find((x) => x.binId === 'BIN-003')!.kind).toBe('critical');
  });

  it('only alerts on threshold crossings', () => {
    const prev = snapshot(bins);
    expect(diffAlerts(prev, setFill(bins, 'BIN-002', 93, 0), 90)).toHaveLength(0); // still full
    expect(diffAlerts(prev, setFill(bins, 'BIN-001', 90, 0), 90)[0]).toMatchObject({ binId: 'BIN-001', kind: 'full' });
    expect(diffAlerts(prev, setFill(bins, 'BIN-002', 96, 0), 90)[0]).toMatchObject({ kind: 'critical' });
    expect(diffAlerts(prev, setFill(bins, 'BIN-003', 5, 0), 90)[0]).toMatchObject({ kind: 'emptied', message: 'BIN-003 has been emptied (5%)' });
  });
});

describe('test-mode simulation', () => {
  it('tick fills non-full bins and keeps values in range', () => {
    const bins = createSampleBins(0);
    const next = simulateTick(bins, 90, () => 0.5, 0);
    next.forEach((b, i) => {
      expect(b.fillLevel).toBeGreaterThanOrEqual(0);
      expect(b.fillLevel).toBeLessThanOrEqual(100);
      if (bins[i].fillLevel < 90) expect(b.fillLevel).toBeGreaterThan(bins[i].fillLevel);
    });
  });

  it('empty-all resets only full bins', () => {
    const next = emptyAllFull(createSampleBins(0), 90, 0);
    expect(next.filter((b) => b.fillLevel >= 90)).toHaveLength(0);
    expect(next.find((b) => b.binId === 'BIN-005')!.fillLevel).toBe(40);
  });
});

describe('realtime applyChange', () => {
  const bins = createSampleBins(0);
  it('updates, inserts and deletes', () => {
    const updated = applyChange(bins, { type: 'upsert', bin: { ...bins[0], fillLevel: 91 } });
    expect(updated[0].fillLevel).toBe(91);
    expect(updated).toHaveLength(bins.length);
    const inserted = applyChange(bins, { type: 'upsert', bin: { ...bins[0], rowId: 99, binId: 'BIN-099' } });
    expect(inserted).toHaveLength(bins.length + 1);
    expect(applyChange(bins, { type: 'delete', rowId: -1 })).toHaveLength(bins.length - 1);
  });
});
