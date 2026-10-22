import { createClient } from '@supabase/supabase-js';
import { mapBinRow } from '../../src/data/binMapper';
import type { Bin } from '../../src/types';

export interface ReadingUpdate {
  fillLevel: number;
  status: string;
  lastUpdated: string;
}

/** Storage used by the API. Supabase in production, in-memory in tests. */
export interface BinStore {
  listBins(): Promise<Bin[]>;
  /** Returns the updated bin, or null when no row has this Bin ID. */
  updateReading(binId: string, update: ReadingUpdate): Promise<Bin | null>;
}

const TABLE = 'bins';

export function createSupabaseStore(url: string, secretKey: string): BinStore {
  const db = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return {
    async listBins() {
      const { data, error } = await db.from(TABLE).select('*');
      if (error) throw new Error(`Supabase: ${error.message}`);
      return (data ?? []).map((r) => mapBinRow(r)).filter((b): b is Bin => b !== null);
    },

    async updateReading(binId, u) {
      const { data, error } = await db
        .from(TABLE)
        .update({ 'Fill Level': u.fillLevel, Status: u.status, 'Last Updated': u.lastUpdated })
        .eq('Bin ID', binId)
        .select();
      if (error) throw new Error(`Supabase: ${error.message}`);
      const row = data?.[0];
      return row ? mapBinRow(row) : null;
    },
  };
}

/** In-memory store for tests and for running the API without Supabase. */
export function createMemoryStore(initial: Bin[]): BinStore {
  let bins = initial.map((b) => ({ ...b }));
  return {
    async listBins() {
      return bins.map((b) => ({ ...b }));
    },
    async updateReading(binId, u) {
      const found = bins.find((b) => b.binId === binId);
      if (!found) return null;
      const updated: Bin = { ...found, fillLevel: u.fillLevel, rawStatus: u.status, lastUpdated: u.lastUpdated };
      bins = bins.map((b) => (b.binId === binId ? updated : b));
      return { ...updated };
    },
  };
}
