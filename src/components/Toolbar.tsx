import { useEffect, useState } from 'react';
import { DEPOT_PRESETS } from '../config';
import type { ConnectionState, DataMode, Depot } from '../types';
import { IconFlask, IconPin, IconRefresh, IconWifi } from './Icons';
import { timeAgo } from './format';

interface Props {
  mode: DataMode;
  onMode: (m: DataMode) => void;
  connection: ConnectionState;
  lastSyncAt: number | null;
  onRefresh: () => void;
  threshold: number;
  onThreshold: (n: number) => void;
  depot: Depot;
  onDepot: (d: Depot) => void;
}

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  idle: 'Sample data',
  unconfigured: 'Supabase not configured',
  connecting: 'Connecting…',
  connected: 'Realtime connected',
  error: 'Realtime unavailable — polling',
  offline: 'Realtime closed — polling',
};

export function Toolbar(p: Props) {
  const [draft, setDraft] = useState(String(p.threshold));
  useEffect(() => setDraft(String(p.threshold)), [p.threshold]);

  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n >= 1 && n <= 100) p.onThreshold(Math.round(n));
    else setDraft(String(p.threshold));
  };

  const presets = DEPOT_PRESETS.some((d) => d.name === p.depot.name) ? DEPOT_PRESETS : [p.depot, ...DEPOT_PRESETS];

  return (
    <div className="toolbar">
      <div className="mode-group">
        <div className="mode-toggle" role="radiogroup" aria-label="Data mode">
          <button role="radio" aria-checked={p.mode === 'test'} className={p.mode === 'test' ? 'on' : ''} onClick={() => p.onMode('test')}>
            <IconFlask /> TEST MODE
          </button>
          <button role="radio" aria-checked={p.mode === 'live'} className={p.mode === 'live' ? 'on' : ''} onClick={() => p.onMode('live')}>
            <IconWifi /> LIVE MODE
          </button>
        </div>
        <div className={`conn conn-${p.connection}`} title={p.lastSyncAt ? `Last sync ${new Date(p.lastSyncAt).toLocaleTimeString()}` : undefined}>
          <span className="dot" />
          {CONNECTION_LABEL[p.connection]}
          {p.lastSyncAt && <span className="muted"> · {timeAgo(p.lastSyncAt)}</span>}
          {p.mode === 'live' && (
            <button className="icon-btn" onClick={p.onRefresh} title="Reload bins from Supabase" aria-label="Reload bins from Supabase">
              <IconRefresh size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="controls">
        <label className="field">
          <span>Collection Threshold</span>
          <div className="input-suffix">
            <input
              type="number"
              min={1}
              max={100}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && commit()}
              aria-label="Collection threshold percent"
            />
            <span>%</span>
          </div>
        </label>
        <label className="field">
          <span>Depot Location</span>
          <div className="select-icon">
            <IconPin size={16} />
            <select
              value={p.depot.name}
              onChange={(e) => {
                const d = presets.find((x) => x.name === e.target.value);
                if (d) p.onDepot(d);
              }}
            >
              {presets.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>
    </div>
  );
}
