import { useState } from 'react';
import { config, isSupabaseConfigured } from '../config';
import type { ConnectionState, DataMode, Depot } from '../types';
import { IconSettings } from './Icons';

interface Props {
  mode: DataMode;
  connection: ConnectionState;
  threshold: number;
  onThreshold: (n: number) => void;
  depot: Depot;
  onDepot: (d: Depot) => void;
  useRoadRouting: boolean;
  onRoadRouting: (on: boolean) => void;
}

export function Settings(p: Props) {
  const [name, setName] = useState(p.depot.name);
  const [lat, setLat] = useState(String(p.depot.lat));
  const [lng, setLng] = useState(String(p.depot.lng));
  const [msg, setMsg] = useState<string | null>(null);
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');

  const saveDepot = () => {
    const la = Number(lat);
    const ln = Number(lng);
    if (!name.trim() || !Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
      setMsg('Enter a name and valid latitude (−90…90) / longitude (−180…180).');
      return;
    }
    p.onDepot({ name: name.trim(), lat: la, lng: ln });
    setMsg('Depot saved. The route is re-optimized automatically.');
  };

  const askNotify = async () => {
    if (typeof Notification === 'undefined') return;
    setPerm(await Notification.requestPermission());
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="card-head"><h2><IconSettings size={22} /> Route Settings</h2></div>
        <div className="form-grid">
          <label className="field">
            <span>Collection threshold (%)</span>
            <input type="number" min={1} max={100} value={p.threshold} onChange={(e) => {
              const n = Number(e.target.value);
              if (n >= 1 && n <= 100) p.onThreshold(Math.round(n));
            }} />
          </label>
          <label className="field check">
            <input type="checkbox" checked={p.useRoadRouting} onChange={(e) => p.onRoadRouting(e.target.checked)} />
            <span>Use road routing (OSRM). If off or unreachable, straight-line estimates are used.</span>
          </label>
        </div>
        <h3>Custom depot</h3>
        <div className="form-grid three">
          <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>Latitude</span><input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" /></label>
          <label className="field"><span>Longitude</span><input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" /></label>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={saveDepot}>Save depot</button>
          {msg && <span className="muted small">{msg}</span>}
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Notifications</h2></div>
        {perm === 'unsupported' ? (
          <p className="muted">This browser does not support desktop notifications. In-app alerts still work.</p>
        ) : perm === 'granted' ? (
          <p>Desktop notifications are <b>enabled</b>. You'll be notified when a bin becomes full or critical.</p>
        ) : perm === 'denied' ? (
          <p className="muted">Desktop notifications are blocked. Allow them in your browser's site settings.</p>
        ) : (
          <button className="btn" onClick={askNotify}>Enable desktop notifications</button>
        )}
      </section>

      <section className="card">
        <div className="card-head"><h2>System</h2></div>
        <dl className="summary">
          <div><dt>Data mode</dt><dd>{p.mode === 'live' ? 'LIVE (Supabase)' : 'TEST (sample bins)'}</dd></div>
          <div><dt>Supabase</dt><dd>{isSupabaseConfigured ? config.supabaseUrl : <span className="txt-Critical">Not configured — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env</span>}</dd></div>
          <div><dt>Table</dt><dd className="mono">public.bins</dd></div>
          <div><dt>Realtime</dt><dd>{p.mode === 'live' ? p.connection : 'not used in TEST MODE'}</dd></div>
          <div><dt>Road routing server</dt><dd>{config.osrmUrl}</dd></div>
          <div><dt>Deployed version (git commit)</dt><dd className="mono">{__APP_COMMIT__}</dd></div>
          <div><dt>Fallback speed / service time</dt><dd>{config.fallbackSpeedKmh} km/h · {config.serviceMinPerBin} min per bin</dd></div>
        </dl>
        <p className="muted small">
          The dashboard only <b>reads</b> from Supabase with the public anon key. ESP32 devices write <span className="mono">Fill Level</span>,{' '}
          <span className="mono">Status</span> and <span className="mono">Last Updated</span> to their own row; changes appear here instantly via Realtime.
        </p>
      </section>
    </div>
  );
}
