import type { BinAlert } from '../types';
import { fmtTime } from './format';
import { IconBell, IconX } from './Icons';

const KIND_LABEL: Record<BinAlert['kind'], string> = { critical: 'Critical', full: 'Full', emptied: 'Emptied', info: 'Info' };

function AlertRow({ a }: { a: BinAlert }) {
  return (
    <li className={`alert-row ${a.read ? 'read' : ''}`}>
      <span className={`dot kind-${a.kind}`} title={KIND_LABEL[a.kind]} />
      <span className="sr-only">{KIND_LABEL[a.kind]}: </span>
      <span className="alert-msg">{a.message}</span>
      <time>{fmtTime(a.at)}</time>
    </li>
  );
}

export function RecentAlerts({ alerts, onViewAll, limit = 5 }: { alerts: BinAlert[]; onViewAll: () => void; limit?: number }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2><IconBell size={22} /> Recent Alerts</h2>
        <button className="link" onClick={onViewAll}>View All</button>
      </div>
      {alerts.length === 0 ? (
        <p className="empty">No alerts yet. You'll be notified here when a bin reaches the collection threshold.</p>
      ) : (
        <ul className="alert-list">
          {alerts.slice(0, limit).map((a) => <AlertRow key={a.id} a={a} />)}
        </ul>
      )}
    </section>
  );
}

export function AlertsView(p: { alerts: BinAlert[]; onMarkAllRead: () => void; onClear: () => void }) {
  const perm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  return (
    <section className="card">
      <div className="card-head">
        <h2><IconBell size={22} /> All Alerts ({p.alerts.length})</h2>
        <div className="btn-row">
          <button className="btn ghost" onClick={p.onMarkAllRead} disabled={!p.alerts.length}>Mark all read</button>
          <button className="btn ghost" onClick={p.onClear} disabled={!p.alerts.length}>Clear</button>
        </div>
      </div>
      {perm !== 'granted' && perm !== 'unsupported' && (
        <p className="hint">Tip: enable desktop notifications in <b>Settings</b> to get full-bin alerts even when this tab is in the background.</p>
      )}
      {p.alerts.length === 0 ? (
        <p className="empty">No alerts in this session.</p>
      ) : (
        <ul className="alert-list">
          {p.alerts.map((a) => <AlertRow key={a.id} a={a} />)}
        </ul>
      )}
    </section>
  );
}

export function Toasts({ toasts, onDismiss }: { toasts: BinAlert[]; onDismiss: (id: string) => void }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast kind-${t.kind}`}>
          <IconBell size={18} />
          <div>
            <strong>{KIND_LABEL[t.kind]} alert</strong>
            <div>{t.message}</div>
          </div>
          <button className="icon-btn" onClick={() => onDismiss(t.id)} aria-label="Dismiss"><IconX size={16} /></button>
        </div>
      ))}
    </div>
  );
}
