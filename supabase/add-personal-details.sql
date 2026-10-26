-- ClauseWise: run once in Supabase -> SQL Editor -> New query -> Run.
-- Adds the "personal" column used by the Personal details screen
-- (what was hidden on upload, other personal details found, and the "Hide these too" switch).
alter table public.contracts add column if not exists personal jsonb;
