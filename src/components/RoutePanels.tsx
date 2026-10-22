import { binLevel } from '../data/binMapper';
import type { RoutePlan } from '../types';
import { fmtKm, fmtMin, fmtPct, fmtTime } from './format';
import { IconBin, IconClock, IconHome, IconPin, IconRefresh, IconRoute } from './Icons';

interface Props {
  plan: RoutePlan | null;
  computing: boolean;
  error: string | null;
  threshold: number;
  onRecompute: () => void;
}

export function RouteStatus({ plan, computing, error, onRecompute }: Props) {
  return (
    <div className="route-status">
      {computing ? (
        <span className="pill pill-busy">Optimizing route…</span>
      ) : plan ? (
        <span className={`pill ${plan.source === 'road' ? 'pill-ok' : 'pill-warn'}`} title={plan.source === 'road' ? 'Distances and times from OSRM road network' : 'Straight-line distance × 1.3 at the fallback speed'}>
          {plan.source === 'road' ? 'Road routing (OSRM)' : 'Estimated (no road data)'}
        </span>
      ) : null}
      {plan && !computing && <span className="muted small">Updated {fmtTime(plan.computedAt)}</span>}
      <button className="icon-btn" onClick={onRecompute} title="Re-optimize now" aria-label="Re-optimize route now"><IconRefresh size={16} /></button>
      {error && <span className="txt-Critical small">{error}</span>}
    </div>
  );
}

export function RouteWarnings({ plan }: { plan: RoutePlan | null }) {
  if (!plan?.warnings.length) return null;
  return (
    <div className="warnings">
      {plan.warnings.map((w) => <p key={w}>⚠ {w}</p>)}
    </div>
  );
}

export function RouteSummary({ plan }: Props) {
  const n = plan?.stops.length ?? 0;
  return (
    <section className="card">
      <div className="card-head"><h2><IconRoute size={22} /> Route Summary</h2></div>
      <dl className="summary">
        <div><dt><IconBin size={16} /> Bins to Collect</dt><dd>{n}</dd></div>
        <div><dt><IconRoute size={16} /> Total Distance</dt><dd>{n ? fmtKm(plan!.totalKm) : '—'}</dd></div>
        <div><dt><IconClock size={16} /> Estimated Time</dt><dd>{n ? fmtMin(plan!.totalMin) : '—'}</dd></div>
        {n > 0 && (
          <div className="sub"><dt>Driving + emptying</dt><dd>{fmtMin(plan!.driveMin)} + {fmtMin(plan!.serviceMin)}</dd></div>
        )}
        {n > 1 && (
          <div className="sub" title="Nearest Neighbour tour length vs. after 2-opt improvement (same distance matrix)">
            <dt>2-opt saving vs Nearest Neighbour</dt>
            <dd>{plan!.improvementPct > 0.05 ? `${plan!.improvementPct.toFixed(1)}% (${fmtKm(plan!.nearestNeighborKm)} → ${fmtKm(plan!.optimizedMatrixKm)})` : 'NN already optimal'}</dd>
          </div>
        )}
        <div><dt><IconPin size={16} /> Start Location</dt><dd>{plan?.depot.name ?? '—'}</dd></div>
        <div><dt><IconHome size={16} /> End Location</dt><dd>{plan?.depot.name ?? '—'}</dd></div>
      </dl>
    </section>
  );
}

export function CollectionOrder({ plan, threshold }: Props) {
  return (
    <section className="card">
      <div className="card-head"><h2><IconRoute size={22} /> Collection Order</h2></div>
      {!plan || plan.stops.length === 0 ? (
        <p className="empty">No bins at or above {threshold}% — no collection needed right now.</p>
      ) : (
        <ol className="order">
          <li><span className="step home"><IconHome size={16} /></span><span className="strong">Start at Depot</span><span className="eta">0 min</span></li>
          {plan.stops.map((s, i) => (
            <li key={s.binId}>
              <span className={`step lvl-${binLevel(s.fillLevel, threshold)}`}>{i + 1}</span>
              <span>
                {s.binId} ({fmtPct(s.fillLevel)})<span className="muted small"> · {s.address}</span>
              </span>
              <span className="eta">{fmtMin(s.arrivalMin)}</span>
            </li>
          ))}
          <li><span className="step home"><IconHome size={16} /></span><span className="strong">Return to Depot</span><span className="eta">{fmtMin(plan.totalMin)}</span></li>
        </ol>
      )}
    </section>
  );
}
