import { useCallback, useEffect, useRef, useState } from 'react';
import { sortBins } from '../data/binMapper';
import { isSupabaseConfigured } from '../config';
import { applyChange, fetchBins, SupabaseNotConfiguredError, subscribeBins } from '../data/liveSource';
import { createSampleBins } from '../data/sampleBins';
import { emptyAllFull, setFill, simulateTick } from '../data/testSource';
import type { Bin, ConnectionState, DataMode } from '../types';

const POLL_FALLBACK_MS = 15_000;
const AUTO_SIM_MS = 4_000;

export interface BinsState {
  bins: Bin[];
  loading: boolean;
  ready: boolean;
  error: string | null;
  connection: ConnectionState;
  lastSyncAt: number | null;
  refresh: () => void;
  /** TEST MODE only (null in LIVE MODE — the dashboard never writes to Supabase). */
  test: null | {
    tick: () => void;
    setFill: (binId: string, fill: number) => void;
    emptyFull: () => void;
    reset: () => void;
    autoSimulate: boolean;
    setAutoSimulate: (on: boolean) => void;
  };
}

export function useBins(mode: DataMode, threshold: number): BinsState {
  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [autoSimulate, setAutoSimulate] = useState(false);
  const loadRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setReady(false);

    if (mode === 'test') {
      setBins(sortBins(createSampleBins()));
      setConnection('idle');
      setLoading(false);
      setReady(true);
      setLastSyncAt(Date.now());
      loadRef.current = () => {};
      return;
    }

    // ---- LIVE MODE: Supabase SELECT + Realtime ----
    setBins([]);
    setAutoSimulate(false);
    setLastSyncAt(null);
    if (!isSupabaseConfigured) {
      setError(new SupabaseNotConfiguredError().message);
      setConnection('unconfigured');
      setLoading(false);
      loadRef.current = () => {};
      return;
    }
    setLoading(true);

    const load = async () => {
      try {
        const rows = await fetchBins();
        if (cancelled) return;
        setBins(sortBins(rows));
        setError(null);
        setReady(true);
        setLastSyncAt(Date.now());
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadRef.current = () => void load();

    let poll: ReturnType<typeof setInterval> | undefined;
    const stopPolling = () => poll && clearInterval(poll);

    const unsubscribe = subscribeBins(
      (change) => {
        if (cancelled) return;
        setBins((prev) => sortBins(applyChange(prev, change)));
        setLastSyncAt(Date.now());
      },
      (status, detail) => {
        if (cancelled) return;
        if (status === 'connected') {
          setConnection('connected');
          stopPolling();
          void load(); // (re)load on every (re)connect so nothing is missed
        } else if (status === 'connecting') {
          setConnection('connecting');
        } else {
          // Realtime unavailable: keep the dashboard working by polling the Data API.
          setConnection(status === 'closed' ? 'offline' : 'error');
          if (detail && status === 'error') console.warn('[realtime]', detail);
          void load();
          stopPolling();
          poll = setInterval(() => void load(), POLL_FALLBACK_MS);
        }
      },
    );

    return () => {
      cancelled = true;
      stopPolling();
      unsubscribe();
    };
  }, [mode]);

  // TEST MODE auto-simulation
  useEffect(() => {
    if (mode !== 'test' || !autoSimulate) return;
    const id = setInterval(() => setBins((prev) => simulateTick(prev, threshold)), AUTO_SIM_MS);
    return () => clearInterval(id);
  }, [mode, autoSimulate, threshold]);

  const refresh = useCallback(() => loadRef.current(), []);

  const test: BinsState['test'] =
    mode === 'test'
      ? {
          tick: () => setBins((prev) => simulateTick(prev, threshold)),
          setFill: (binId, fill) => setBins((prev) => setFill(prev, binId, fill)),
          emptyFull: () => setBins((prev) => emptyAllFull(prev, threshold)),
          reset: () => setBins(sortBins(createSampleBins())),
          autoSimulate,
          setAutoSimulate,
        }
      : null;

  return { bins, loading, ready, error, connection, lastSyncAt, refresh, test };
}
