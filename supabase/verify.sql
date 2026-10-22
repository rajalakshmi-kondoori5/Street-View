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
-- HARDENING: run ONLY after the backend is deployed and the ESP32 posts to it
-- (Serial Monitor shows "Sent BIN-001 = ..").
-- The dashboard only needs SELECT, and the backend writes with the secret key
-- (which bypasses RLS), so the public key no longer needs UPDATE at all.
--
-- drop policy if exists "<your update policy name from query 3>" on public.bins;
-- revoke update, insert, delete on public.bins from anon;
