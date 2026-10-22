# Street-View

An AI and IoT-based smart waste management system that monitors bin fill levels in real time, identifies bins requiring collection, and optimizes collection routes to reduce travel distance, time, fuel consumption, and operational costs.

**AI-Driven Smart Waste Bin Monitoring & Route Optimization**

```
HC-SR04 → ESP32 ──HTTPS + device key──► Backend API (Render) ──secret key──► Supabase (bins)
                                         GET /api/route (NN + 2-opt)            │ Realtime
                                                                                ▼
                                              React dashboard (Vercel): bins ≥ threshold →
                                              OSRM matrix → Nearest Neighbour → 2-opt →
                                              Depot→bins→Depot · map · alerts
```

## Quick start

```bash
npm install
cp .env.example .env        # then edit .env (see below)
npm run dev                 # http://localhost:5173
```

`.env` (only the **public anon key** — never the service-role key):

| Variable | Default | Meaning |
|---|---|---|
| `VITE_SUPABASE_URL` | – | `https://mimobvudcwnbupwfghpd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | – | Project Settings → API → anon/publishable key |
| `VITE_DATA_MODE` | `test` | Mode the dashboard opens in (`test` or `live`) |
| `VITE_FILL_THRESHOLD` | `90` | Fill % at which a bin is added to the route |
| `VITE_DEPOT_NAME/LAT/LNG` | Malkajgiri, Hyderabad | Truck start/end point |
| `VITE_OSRM_URL` | public OSRM demo | Road-routing server |
| `VITE_FALLBACK_SPEED_KMH` | `25` | Speed used when road data is unavailable |
| `VITE_SERVICE_MIN_PER_BIN` | `2` | Minutes to empty one bin |

Threshold, depot and road-routing on/off can also be changed in the UI (saved in the browser).

## Modes

- **TEST MODE** – 8 sample bins around Malkajgiri. Use *Simulate sensor update*, *Auto-simulate*, the per-bin sliders (Bins page) and *Collect all full bins* to drive the whole pipeline without hardware.
- **LIVE MODE** – reads `public.bins` from Supabase and subscribes to Realtime. Any row the ESP32 inserts or updates appears instantly, re-triggers alerts and re-optimizes the route. Bin IDs come from the table — nothing is hardcoded. If Realtime is unavailable the dashboard falls back to polling every 15 s.

The dashboard never writes to Supabase.

## Route optimization (`src/routing/`)

1. Select bins with `Fill Level ≥ threshold`; bins without valid coordinates are listed as skipped.
2. Distance/time matrix for depot + bins from OSRM `/table` (road network). If OSRM is unreachable: straight-line distance × 1.3 at the fallback speed, clearly labelled *Estimated* (dashed line on the map).
3. **Nearest Neighbour** tour from the depot.
4. **2-opt** improvement until no move shortens the tour (full re-evaluation, so it is correct for one-way-street asymmetric matrices).
5. OSRM `/route` for the final order → road geometry and per-leg times; total = driving + service time per bin.

Re-optimization happens only when the *set* of bins to collect, their positions, the depot or the threshold change (debounced), not on every sensor reading.

## Alerts

Raised on threshold **crossings** only (no repeats for a bin that stays full): *ready for collection* (≥ threshold), *Critical* (≥ 95 %), *emptied* (drops below threshold). Shown as toasts, in Recent Alerts / Alerts page with an unread badge, and optionally as desktop notifications (Settings).

## ESP32

`esp32/smart_bin/smart_bin.ino` measures with the HC-SR04, converts distance to fill % and POSTs `{"fillLevel": n}` to `API_URL/api/bins/<BIN_ID>/reading` with header `X-Device-Key`. Copy `secrets.example.h` → `secrets.h` (git-ignored). The device holds no Supabase key and does no routing/AI.

## Backend (`backend/`, deployed on Render)

Express API. It reuses the same routing code as the dashboard (`src/routing`, bundled with esbuild).

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness check (used by Render) |
| `GET /api/bins` | All bins |
| `GET /api/route?threshold=90&depotLat=&depotLng=&road=true` | Optimized Depot → full bins → Depot plan |
| `POST /api/bins/:binId/reading` | ESP32 ingest. Header `X-Device-Key`, body `{"fillLevel": 0-100}`. The server checks the per-bin key, sets `Status` and `Last Updated`, and writes with the Supabase secret key. Rate-limited per bin. |

```bash
cd backend
npm install
cp .env.example .env   # SUPABASE_SECRET_KEY, DEVICE_KEYS=BIN-001:<secret>, ...
npm run dev            # http://localhost:8080
npm test               # 9 API tests (in-memory store, no Supabase needed)
```

The dashboard does not depend on the backend: it reads Supabase directly (with Realtime) and optimizes in the browser, so it stays fast even while Render's free tier is asleep.

## Deployment

**Backend → Render**: New → Blueprint → select this repo (uses `render.yaml`). Then set the secret env vars in the Render dashboard:
- `SUPABASE_SECRET_KEY`: Supabase → Project Settings → API Keys → secret key (server only)
- `DEVICE_KEYS`: `BIN-001:<same value as DEVICE_KEY in the ESP32 secrets.h>` (add more bins with commas)
- `CORS_ORIGINS`: your Vercel URL, e.g. `https://street-view.vercel.app`

Then put the Render URL into the ESP32 `secrets.h` as `API_URL` and re-flash.

**Frontend → Vercel**: Add New → Project → import this repo (root directory `.`; Vite is detected, see `vercel.json`). Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key), and `VITE_DATA_MODE=live` if the deployed site should open in LIVE MODE.

**After the ESP32 posts through the backend**, run the hardening block at the end of `supabase/verify.sql` so the public key can no longer write.

## Supabase checks

`supabase/verify.sql` lists the columns, confirms `bins` is in the Realtime publication, shows RLS policies, and finds bins without coordinates. The commented hardening block at the end removes the public key's write access once the backend is live.

## Scripts

`npm run dev` · `npm run build` · `npm test` (routing, mapper, alerts, simulator unit tests) · `npm run typecheck`

## Project layout

```
src/
  constants.ts           shared constants (no Vite), used by the backend too
  config.ts              env-driven settings, depot presets
  lib/supabase.ts        browser client (anon key)
  data/                  binMapper (column mapping), liveSource (SELECT + Realtime),
                         sampleBins + testSource (TEST MODE), alerts (crossing detection)
  routing/               distance, costMatrix, osrm, tsp (NN + 2-opt), optimizeRoute
  hooks/                 useBins, useAlerts, useOptimizedRoute, usePersistentState
  components/            Header, Sidebar, Toolbar, KpiCards, BinTable, RouteMap,
                         RoutePanels, AlertsPanel, Analytics, Settings
backend/                 Express API for Render (ingest + route API)
esp32/smart_bin/         ESP32 firmware
supabase/verify.sql      read-only checks
```
