import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { binLevel, clampFill, parseNumber } from '../../src/data/binMapper';
import { optimizeRoute, selectFullBins } from '../../src/routing/optimizeRoute';
import type { FetchFn } from '../../src/routing/osrm';
import type { Depot } from '../../src/types';
import { createRateLimiter, isValidDeviceKey } from './deviceAuth';
import type { AppConfig } from './env';
import type { BinStore } from './store';

export interface AppDeps {
  config: AppConfig;
  store: BinStore;
  fetchFn?: FetchFn;
  now?: () => number;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Wrap async handlers so rejected promises reach the error middleware. */
const route = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

function queryNumber(value: unknown, fallback: number, min: number, max: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${name} must be a number between ${min} and ${max}`);
  return n;
}

export function createApp({ config, store, fetchFn, now = Date.now }: AppDeps) {
  const app = express();
  const allowReading = createRateLimiter(config.minReadingIntervalSec * 1000, now);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));
  // Browsers: only the listed dashboard origins (all origins if none configured). Devices don't use CORS.
  app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : true }));

  app.get('/', (_req, res) => {
    res.json({ name: 'Street View API', endpoints: ['GET /health', 'GET /api/bins', 'GET /api/route', 'POST /api/bins/:binId/reading'] });
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, commit: config.commit, time: new Date(now()).toISOString(), devicesRegistered: config.deviceKeys.size });
  });

  /** All bins (same shape the dashboard uses). */
  app.get(
    '/api/bins',
    route(async (_req, res) => {
      const bins = await store.listBins();
      res.json({ count: bins.length, threshold: config.fillThreshold, bins });
    }),
  );

  /**
   * Optimized collection route: bins >= threshold, Nearest Neighbour + 2-opt, depot -> bins -> depot.
   * Query (all optional): threshold, depotLat, depotLng, depotName, road=false
   */
  app.get(
    '/api/route',
    route(async (req, res) => {
      const threshold = queryNumber(req.query.threshold, config.fillThreshold, 1, 100, 'threshold');
      const depot: Depot = {
        name: typeof req.query.depotName === 'string' && req.query.depotName ? req.query.depotName : config.depot.name,
        lat: queryNumber(req.query.depotLat, config.depot.lat, -90, 90, 'depotLat'),
        lng: queryNumber(req.query.depotLng, config.depot.lng, -180, 180, 'depotLng'),
      };
      const bins = await store.listBins();
      const plan = await optimizeRoute(bins, depot, {
        threshold,
        useRoadRouting: req.query.road !== 'false',
        osrmUrl: config.osrmUrl,
        fallbackSpeedKmh: config.fallbackSpeedKmh,
        serviceMinPerBin: config.serviceMinPerBin,
        fetchFn,
      });
      res.json({ threshold, fullBins: selectFullBins(bins, threshold).map((b) => b.binId), plan });
    }),
  );

  /**
   * ESP32 ingest. Header `X-Device-Key: <secret for this bin>`, body `{ "fillLevel": 0-100 }`.
   * The server sets Status and Last Updated, then writes with the server-only Supabase key.
   */
  app.post(
    '/api/bins/:binId/reading',
    route(async (req, res) => {
      const binId = String(req.params.binId).trim();
      if (!isValidDeviceKey(config.deviceKeys, binId, req.get('x-device-key') ?? undefined)) {
        throw new HttpError(401, 'Invalid or missing device key for this bin');
      }
      const raw = parseNumber(req.body?.fillLevel);
      if (!Number.isFinite(raw) || raw < 0 || raw > 100) throw new HttpError(400, 'fillLevel must be a number from 0 to 100');
      if (!allowReading(binId)) throw new HttpError(429, `Too many readings; wait ${config.minReadingIntervalSec}s between readings`);

      const fillLevel = clampFill(raw);
      const status = binLevel(fillLevel, config.fillThreshold);
      const bin = await store.updateReading(binId, { fillLevel, status, lastUpdated: new Date(now()).toISOString() });
      if (!bin) throw new HttpError(404, `No row in bins with Bin ID "${binId}". Add the bin (with Address/Latitude/Longitude) first.`);
      res.json({ ok: true, bin });
    }),
  );

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  // Express recognises an error handler by its four parameters, so `_next` must stay.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof SyntaxError) return res.status(400).json({ error: 'Body must be valid JSON' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
