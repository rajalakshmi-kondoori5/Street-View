import { useState } from 'react';
import { binLevel } from '../data/binMapper';
import type { Bin, RoutePlan } from '../types';
import { fmtKm, fmtPct } from './format';
import { IconChart } from './Icons';

/** Horizontal bar chart: fill level per bin, sorted high → low, with the threshold drawn as a rule. */
function FillChart({ bins, threshold }: { bins: Bin[]; threshold: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const sorted = [...bins].sort((a, b) => b.fillLevel - a.fillLevel);
  return (
    <div className="hchart" role="img" aria-label={`Fill level per bin; collection threshold ${threshold}%`}>
      <div className="hchart-rule" style={{ left: `calc(var(--label-w) + (100% - var(--label-w) - var(--value-w)) * ${threshold / 100})` }}>
        <span>{threshold}% threshold</span>
      </div>
      {sorted.map((b) => {
        const level = binLevel(b.fillLevel, threshold);
        return (
          <div key={String(b.rowId)} className={`hchart-row ${hover === b.binId ? 'hover' : ''}`} onMouseEnter={() => setHover(b.binId)} onMouseLeave={() => setHover(null)}>
            <span className="hchart-label mono">{b.binId}</span>
            <div className="hchart-track">
              <div className={`hchart-bar lvl-${level}`} style={{ width: `${Math.max(b.fillLevel, 0.5)}%` }} />
              {hover === b.binId && (
                <div className="hchart-tip" style={{ left: `${Math.min(b.fillLevel, 80)}%` }}>
                  <b>{b.binId}</b> · {b.address}
                  <br />
                  {fmtPct(b.fillLevel)} — {level}
                </div>
              )}
            </div>
            <span className="hchart-value">{fmtPct(b.fillLevel)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Analytics({ bins, threshold, plan }: { bins: Bin[]; threshold: number; plan: RoutePlan | null }) {
  // Bands are relative to the threshold so they stay meaningful when it changes.
  const half = Math.round(threshold / 2);
  const critical = Math.max(95, threshold);
  const count = (lo: number, hi: number) => bins.filter((b) => b.fillLevel >= lo && b.fillLevel < hi).length;
  const bands = [
    { label: `0–${half}%`, n: count(0, half) },
    { label: `${half}–${threshold}%`, n: count(half, threshold) },
    { label: `${threshold}–${critical}% (full)`, n: count(threshold, critical) },
    { label: `≥ ${critical}% (critical)`, n: count(critical, Infinity) },
  ];
  const located = bins.filter((b) => b.lat !== null).length;
  return (
    <div className="stack">
      <section className="card">
        <div className="card-head"><h2><IconChart size={22} /> Fill Level by Bin</h2></div>
        {bins.length ? <FillChart bins={bins} threshold={threshold} /> : <p className="empty">No bins loaded.</p>}
        <div className="legend-inline">
          <span><i className="sw lvl-Normal" /> Normal</span>
          <span><i className="sw lvl-Full" /> Full (≥ {threshold}%)</span>
          <span><i className="sw lvl-Critical" /> Critical (≥ {Math.max(95, threshold)}%)</span>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Fill Distribution</h2></div>
          <div className="stat-grid">
            {bands.map((b) => (
              <div key={b.label} className="stat"><div className="stat-value">{b.n}</div><div className="stat-label">bins at {b.label}</div></div>
            ))}
          </div>
          <p className="muted small">{located} of {bins.length} bins have valid coordinates for routing.</p>
        </section>
        <section className="card">
          <div className="card-head"><h2>Route Optimizer</h2></div>
          {plan && plan.stops.length ? (
            <div className="stat-grid">
              <div className="stat"><div className="stat-value">{fmtKm(plan.nearestNeighborKm)}</div><div className="stat-label">Nearest Neighbour tour</div></div>
              <div className="stat"><div className="stat-value">{fmtKm(plan.optimizedMatrixKm)}</div><div className="stat-label">After 2-opt</div></div>
              <div className="stat"><div className="stat-value">{plan.improvementPct.toFixed(1)}%</div><div className="stat-label">Distance saved</div></div>
              <div className="stat"><div className="stat-value">{plan.source === 'road' ? 'OSRM' : 'Estimate'}</div><div className="stat-label">Distance source</div></div>
            </div>
          ) : (
            <p className="empty">No route — no bins at or above {threshold}%.</p>
          )}
        </section>
      </div>
    </div>
  );
}
