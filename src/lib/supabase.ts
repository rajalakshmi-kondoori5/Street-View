import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, isSupabaseConfigured } from '../config';

/**
 * Browser Supabase client. Uses ONLY the public anon/publishable key (safe with RLS).
 * The service-role key must never be used in this app.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export const BINS_TABLE = 'bins';
