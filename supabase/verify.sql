-- Run in the Supabase SQL editor to confirm the dashboard's requirements.
-- Nothing here changes data. The optional section at the end is commented out.

-- 1. Columns the dashboard reads
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'bins'
order by ordinal_position;

-- 2. Realtime: `bins` must be in the supabase_realtime publication
select * from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'bins';
-- if no row:  alter publication supabase_realtime add table public.bins;

-- 3. RLS policies currently on `bins`
select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'bins';

-- 4. Bins that cannot be routed (missing / zero coordinates)
select "Bin ID", "Latitude", "Longitude" from public.bins
where "Latitude" is null or "Longitude" is null or ("Latitude" = 0 and "Longitude" = 0);

-- ---------------------------------------------------------------------------
-- OPTIONAL hardening (review before running).
-- The dashboard only needs SELECT. If your UPDATE policy allows the `anon` role,
-- anyone with the public key can change fill levels. A middle ground for a demo is to
-- let anon update ONLY the sensor columns:
--
-- revoke update on public.bins from anon;
-- grant update ("Fill Level", "Status", "Last Updated") on public.bins to anon;
--
-- For production, give each ESP32 its own credentials (or send readings through an
-- Edge Function that checks a per-device secret) instead of the shared anon key.
