# Street View — AI-Driven Smart Waste Bin Monitoring & Route Optimization

```
HC-SR04 → ESP32 → Wi-Fi → Supabase (bins table) ──Realtime──► React dashboard
                                                               │
                                     bins ≥ threshold → OSRM distance matrix
                                     → Nearest Neighbour → 2-opt → Depot→bins→Depot
                                                               │
                                     map · route summary · collection order · alerts
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

`esp32/smart_bin/smart_bin.ino` measures with the HC-SR04, converts distance to fill %, and PATCHes its own row (`"Bin ID" = BIN_ID`) with `Fill Level`, `Status`, `Last Updated`. Copy `secrets.example.h` → `secrets.h`. The device does no routing/AI.

## Supabase checks

`supabase/verify.sql` lists the columns, confirms `bins` is in the Realtime publication, shows RLS policies, and finds bins without coordinates. It also contains an optional (commented) hardening step: if anon can UPDATE every column, anyone with the public key can change data.

## Scripts

`npm run dev` · `npm run build` · `npm test` (routing, mapper, alerts, simulator unit tests) · `npm run typecheck`

## Project layout

```
src/
  config.ts              env-driven settings, depot presets
  lib/supabase.ts        browser client (anon key)
  data/                  binMapper (column mapping), liveSource (SELECT + Realtime),
                         sampleBins + testSource (TEST MODE), alerts (crossing detection)
  routing/               distance, costMatrix, osrm, tsp (NN + 2-opt), optimizeRoute
  hooks/                 useBins, useAlerts, useOptimizedRoute, usePersistentState
  components/            Header, Sidebar, Toolbar, KpiCards, BinTable, RouteMap,
                         RoutePanels, AlertsPanel, Analytics, Settings
esp32/smart_bin/         ESP32 firmware
supabase/verify.sql      read-only checks
```
