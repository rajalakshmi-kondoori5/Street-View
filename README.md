# Street-View

An AI and IoT-based smart waste management system that monitors bin fill levels in real time, identifies bins requiring collection, and optimizes collection routes to reduce travel distance, time, fuel consumption, and operational costs.

**AI-Driven Smart Waste Bin Monitoring & Route Optimization**

```
HC-SR04 → ESP32 ──Wi-Fi / HTTPS──► Supabase (bins) ──Realtime──► React dashboard (Vercel)
                                        │                         bins ≥ threshold → OSRM matrix →
                                        │                         Nearest Neighbour → 2-opt →
                                        │                         Depot→bins→Depot · map · alerts
                                        └──► Backend API (Render): GET /api/route (NN + 2-opt)
```

## Live deployment

| Part | URL |
|---|---|
| Dashboard (Vercel) | https://street-view-dashboard.vercel.app |
| Backend health check (Render) | https://street-view.onrender.com/health |
| Optimized route API (Render) | https://street-view.onrender.com/api/route |

The Render free tier sleeps when idle, so the first backend request can take up to a minute.

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

`esp32/smart_bin/smart_bin.ino` measures with the HC-SR04, converts distance to fill %, and PATCHes its own row in Supabase (`"Bin ID" = BIN_ID`) with `Fill Level`, `Status` and `Last Updated`, using the publishable key. Copy `secrets.example.h` → `secrets.h` (git-ignored). The device does no routing/AI.

Note: this needs the anon UPDATE policy on `bins`, so anyone who has the publishable key can also change fill levels. The backend's `POST /api/bins/:binId/reading` endpoint (below) is an optional, more secure alternative for later.

## Backend (`backend/`, deployed on Render)

Express API. It reuses the same routing code as the dashboard (`src/routing`, bundled with esbuild).

| Endpoint | Purpose |
|---|---|
| `GET /health` | Liveness check (used by Render) |
| `GET /api/bins` | All bins |
| `GET /api/route?threshold=90&depotLat=&depotLng=&road=true` | Optimized Depot → full bins → Depot plan |
| `POST /api/bins/:binId/reading` | Optional secure ingest (the current ESP32 sketch does not use it). Header `X-Device-Key`, body `{"fillLevel": 0-100}`. The server checks the per-bin key, sets `Status` and `Last Updated`, and writes with the Supabase secret key. Rate-limited per bin. |

```bash
cd backend
npm install
cp .env.example .env   # SUPABASE_SECRET_KEY, DEVICE_KEYS=BIN-001:<secret>, ...
npm run dev            # http://localhost:8080
npm test               # 9 API tests (in-memory store, no Supabase needed)
```

The dashboard does not depend on the backend: it reads Supabase directly (with Realtime) and optimizes in the browser, so it stays fast even while Render's free tier is asleep.

## Deployment

**Backend → Render** (New → Web Service → connect this repo):

| Field | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Environment variables:
- `SUPABASE_URL`: `https://mimobvudcwnbupwfghpd.supabase.co`
- `SUPABASE_SECRET_KEY`: Supabase → Project Settings → API Keys → secret key (server only)
- `CORS_ORIGINS`: your Vercel URL, e.g. `https://street-view.vercel.app`
- `DEVICE_KEYS`: optional, only if you later switch the ESP32 to the secure ingest endpoint

(Alternatively, New → Blueprint uses `render.yaml` with the same settings.)

**Auto-deploy on Render:** with Root Directory `backend`, Render only redeploys for changes inside `backend/`, but the API also bundles shared code from `src/`. In Settings → Build & Deploy → **Build Filters → Included Paths**, add:
`backend/**`, `src/routing/**`, `src/data/binMapper.ts`, `src/constants.ts`, `src/types.ts`.
Check what is live at `https://street-view.onrender.com/health` (`commit` field).

**Frontend → Vercel**: Add New → Project → import this repo (root directory `.`; Vite is detected, see `vercel.json`). Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key), and `VITE_DATA_MODE=live` if the deployed site should open in LIVE MODE. Every push to `main` redeploys `https://street-view-dashboard.vercel.app`; the deployed commit is shown under Settings → System. Environment variables are build-time: after changing one in Vercel, redeploy.

## Supabase checks

`supabase/verify.sql` lists the columns, confirms `bins` is in the Realtime publication, shows RLS policies, and finds bins without coordinates. The commented hardening block at the end removes the public key's write access; do **not** run it while the ESP32 writes to Supabase directly, or the device's updates will be rejected.

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
