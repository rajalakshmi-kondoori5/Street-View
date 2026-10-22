import type { RealtimeChannel } from '@supabase/supabase-js';
import { BINS_TABLE, supabase } from '../lib/supabase';
import type { Bin } from '../types';
import { mapBinRow } from './binMapper';

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart the dev server.');
  }
}

/** Load every bin from Supabase. Bin IDs come from the table — nothing is hardcoded. */
export async function fetchBins(): Promise<Bin[]> {
  if (!supabase) throw new SupabaseNotConfiguredError();
  const { data, error } = await supabase.from(BINS_TABLE).select('*');
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data ?? []).map((r) => mapBinRow(r as Record<string, unknown>)).filter((b): b is Bin => b !== null);
}

export type BinChange =
  | { type: 'upsert'; bin: Bin }
  | { type: 'delete'; rowId: number | string };

export type RealtimeStatus = 'connecting' | 'connected' | 'error' | 'closed';

/**
 * Subscribe to INSERT / UPDATE / DELETE on `bins`. Each ESP32 write arrives here.
 * Returns an unsubscribe function.
 */
export function subscribeBins(onChange: (c: BinChange) => void, onStatus: (s: RealtimeStatus, detail?: string) => void): () => void {
  if (!supabase) {
    onStatus('error', new SupabaseNotConfiguredError().message);
    return () => {};
  }
  const client = supabase;
  onStatus('connecting');
  const channel: RealtimeChannel = client
    .channel(`bins-changes-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: BINS_TABLE }, (payload) => {
      if (payload.eventType === 'DELETE') {
        const old = payload.old as Record<string, unknown>;
        if (old?.id !== undefined) onChange({ type: 'delete', rowId: old.id as number | string });
        return;
      }
      const bin = mapBinRow(payload.new as Record<string, unknown>);
      if (bin) onChange({ type: 'upsert', bin });
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') onStatus('connected');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus('error', err?.message ?? status);
      else if (status === 'CLOSED') onStatus('closed');
    });

  return () => {
    void client.removeChannel(channel);
  };
}

/** Apply one realtime change to the current list (pure). */
export function applyChange(bins: Bin[], change: BinChange): Bin[] {
  if (change.type === 'delete') return bins.filter((b) => b.rowId !== change.rowId);
  const idx = bins.findIndex((b) => b.rowId === change.bin.rowId || b.binId === change.bin.binId);
  if (idx === -1) return [...bins, change.bin];
  const next = [...bins];
  next[idx] = change.bin;
  return next;
}
