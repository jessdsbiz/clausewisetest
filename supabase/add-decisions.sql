-- ClauseWise SG: run once in Supabase -> SQL Editor -> New query -> Run.
-- Adds the column used by "You decide" (PRD FR8):
--   decisions: the user's marks on each warning ("ask" / "ok" / "wrong"), the draft message as last
--              edited, its plain-words version, and the option they picked
alter table public.contracts add column if not exists decisions jsonb;
