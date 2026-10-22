import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createSampleBins } from '../../src/data/sampleBins';
import { createApp } from './app';
import { loadConfig, parseDeviceKeys } from './env';
import { createMemoryStore } from './store';

const KEY = 'test-secret-001';

function setup(now = () => Date.parse('2026-10-22T10:00:00Z')) {
  const config = loadConfig({ DEVICE_KEYS: `BIN-001:${KEY},BIN-002:other`, MIN_READING_INTERVAL_SEC: '2' });
  const store = createMemoryStore(createSampleBins(0));
  // OSRM unreachable in tests -> optimizer falls back to straight-line estimates
  const fetchFn = async () => {
    throw new Error('offline');
  };
  return { app: createApp({ config, store, fetchFn, now }), store };
}

describe('config', () => {
  it('parses device keys', () => {
    expect([...parseDeviceKeys(' BIN-001:abc , BIN-002:d:e ,bad,:x').entries()]).toEqual([
      ['BIN-001', 'abc'],
      ['BIN-002:d', 'e'],
    ]);
  });
});

describe('ESP32 ingest', () => {
  it('rejects a missing or wrong device key', async () => {
    const { app } = setup();
    await request(app).post('/api/bins/BIN-001/reading').send({ fillLevel: 50 }).expect(401);
    await request(app).post('/api/bins/BIN-001/reading').set('X-Device-Key', 'wrong').send({ fillLevel: 50 }).expect(401);
    // another bin's key does not work for BIN-001
    await request(app).post('/api/bins/BIN-001/reading').set('X-Device-Key', 'other').send({ fillLevel: 50 }).expect(401);
  });

  it('validates the reading', async () => {
    const { app } = setup();
    for (const body of [{}, { fillLevel: 'abc' }, { fillLevel: 101 }, { fillLevel: -1 }]) {
      await request(app).post('/api/bins/BIN-001/reading').set('X-Device-Key', KEY).send(body).expect(400);
    }
    await request(app).post('/api/bins/BIN-001/reading').set('X-Device-Key', KEY).set('Content-Type', 'application/json').send('{bad').expect(400);
  });

  it('stores the reading with server-computed status and timestamp', async () => {
    const { app, store } = setup();
    const res = await request(app).post('/api/bins/BIN-001/reading').set('X-Device-Key', KEY).send({ fillLevel: 96 }).expect(200);
    expect(res.body.bin).toMatchObject({ binId: 'BIN-001', fillLevel: 96, rawStatus: 'Critical', lastUpdated: '2026-10-22T10:00:00.000Z' });
    const saved = (await store.listBins()).find((b) => b.binId === 'BIN-001');
    expect(saved?.fillLevel).toBe(96);
  });

  it('rate-limits a flooding device', async () => {
    let t = 0;
    const { app } = setup(() => t);
    await request(app).post('/api/bins/BIN-001/reading').set('X-Device-Key', KEY).send({ fillLevel: 10 }).expect(200);
    await request(app).post('/api/bins/BIN-001/reading').set('X-Device-Key', KEY).send({ fillLevel: 11 }).expect(429);
    t = 2500;
    await request(app).post('/api/bins/BIN-001/reading').set('X-Device-Key', KEY).send({ fillLevel: 12 }).expect(200);
  });

  it('returns 404 for a registered key whose bin row does not exist', async () => {
    const config = loadConfig({ DEVICE_KEYS: 'BIN-999:k' });
    const app = createApp({ config, store: createMemoryStore([]) });
    await request(app).post('/api/bins/BIN-999/reading').set('X-Device-Key', 'k').send({ fillLevel: 5 }).expect(404);
  });
});

describe('route API', () => {
  it('returns an optimized depot -> full bins -> depot plan', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/route').expect(200);
    expect(res.body.fullBins.sort()).toEqual(['BIN-002', 'BIN-003', 'BIN-004', 'BIN-007']);
    expect(res.body.plan.stops).toHaveLength(4);
    expect(res.body.plan.source).toBe('estimated');
    expect(res.body.plan.totalKm).toBeGreaterThan(0);
  });

  it('honours threshold and depot overrides and validates them', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/route?threshold=60&depotLat=17.44&depotLng=78.5&depotName=Test&road=false').expect(200);
    expect(res.body.threshold).toBe(60);
    expect(res.body.plan.depot).toEqual({ name: 'Test', lat: 17.44, lng: 78.5 });
    await request(app).get('/api/route?threshold=500').expect(400);
  });

  it('serves health, bins and 404', async () => {
    const { app } = setup();
    expect((await request(app).get('/health').expect(200)).body).toMatchObject({ ok: true, commit: 'local', devicesRegistered: 2 });
    expect((await request(app).get('/api/bins').expect(200)).body.count).toBe(8);
    await request(app).get('/nope').expect(404);
  });
});
