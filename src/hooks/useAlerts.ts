import { useCallback, useEffect, useRef, useState } from 'react';
import { diffAlerts, snapshot } from '../data/alerts';
import type { Bin, BinAlert, DataMode } from '../types';

const MAX_ALERTS = 100;
const TOAST_MS = 6_000;

function notifyDesktop(alert: BinAlert) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (alert.kind === 'info') return;
  try {
    new Notification('Street View — Bin alert', { body: alert.message, tag: `${alert.binId}-${alert.kind}` });
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

export function useAlerts(bins: Bin[], threshold: number, ready: boolean, mode: DataMode) {
  const [alerts, setAlerts] = useState<BinAlert[]>([]);
  const [toasts, setToasts] = useState<BinAlert[]>([]);
  const prev = useRef<Map<string, number> | null>(null);

  // A new data source starts a fresh alert history.
  useEffect(() => {
    prev.current = null;
    setAlerts([]);
    setToasts([]);
  }, [mode]);

  useEffect(() => {
    if (!ready) return;
    const fresh = diffAlerts(prev.current, bins, threshold);
    prev.current = snapshot(bins);
    if (!fresh.length) return;
    setAlerts((a) => [...fresh.reverse(), ...a].slice(0, MAX_ALERTS));
    setToasts((t) => [...fresh.slice(0, 3), ...t].slice(0, 4));
    fresh.forEach(notifyDesktop);
    const ids = new Set(fresh.map((f) => f.id));
    setTimeout(() => setToasts((t) => t.filter((x) => !ids.has(x.id))), TOAST_MS);
  }, [bins, threshold, ready]);

  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const markAllRead = useCallback(() => setAlerts((a) => a.map((x) => ({ ...x, read: true }))), []);
  const clear = useCallback(() => setAlerts([]), []);

  return { alerts, toasts, unread: alerts.filter((a) => !a.read).length, dismissToast, markAllRead, clear };
}
