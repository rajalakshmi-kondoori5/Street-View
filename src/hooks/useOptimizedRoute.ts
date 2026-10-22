import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '../config';
import { optimizeRoute, selectFullBins } from '../routing/optimizeRoute';
import type { Bin, Depot, RoutePlan } from '../types';

const DEBOUNCE_MS = 800;

/**
 * Re-optimises only when the *set* of bins to collect (or their positions, the depot,
 * threshold or routing mode) changes — not on every small sensor reading — so OSRM isn't flooded.
 */
export function useOptimizedRoute(bins: Bin[], depot: Depot, threshold: number, useRoadRouting: boolean, enabled: boolean) {
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const runId = useRef(0);
  const binsRef = useRef(bins);
  binsRef.current = bins;

  const signature = useMemo(
    () =>
      selectFullBins(bins, threshold)
        .map((b) => `${b.binId}@${b.lat},${b.lng}`)
        .sort()
        .join('|') + `#${depot.lat},${depot.lng}#${threshold}#${useRoadRouting}`,
    [bins, threshold, depot.lat, depot.lng, useRoadRouting],
  );

  useEffect(() => {
    if (!enabled) return;
    const id = ++runId.current;
    setComputing(true);
    const timer = setTimeout(async () => {
      try {
        const result = await optimizeRoute(binsRef.current, depot, {
          threshold,
          useRoadRouting,
          osrmUrl: config.osrmUrl,
          fallbackSpeedKmh: config.fallbackSpeedKmh,
          serviceMinPerBin: config.serviceMinPerBin,
        });
        if (id === runId.current) {
          setPlan(result);
          setError(null);
        }
      } catch (e) {
        if (id === runId.current) setError((e as Error).message);
      } finally {
        if (id === runId.current) setComputing(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [signature, enabled, nonce]);

  // Keep stop fill levels current without re-routing.
  const livePlan = useMemo(() => {
    if (!plan) return null;
    const fill = new Map(bins.map((b) => [b.binId, b.fillLevel]));
    return { ...plan, stops: plan.stops.map((s) => ({ ...s, fillLevel: fill.get(s.binId) ?? s.fillLevel })) };
  }, [plan, bins]);

  const recompute = useCallback(() => setNonce((n) => n + 1), []);

  return { plan: livePlan, computing, error, recompute };
}
