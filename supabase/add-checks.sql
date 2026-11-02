-- ClauseWise SG: run once in Supabase -> SQL Editor -> New query -> Run.
-- Adds the column used by "Make it fail" (PRD FR10):
--   checks: which AI did the second check (NVIDIA, or Claude as the backup), what it found wrong
--           or missed, and what was fixed. The fixes themselves are saved in summary, risks and tailored.
alter table public.contracts add column if not exists checks jsonb;
