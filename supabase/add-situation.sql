-- ClauseWise SG: run once in Supabase -> SQL Editor -> New query -> Run.
-- Adds the columns used by "Your situation" (PRD FR7):
--   situation: what the user typed in "Tell us about you", masked like raw_text
--   tailored:  the summary order, "Why this matters for you" lines and "Your plan before you sign"
alter table public.contracts add column if not exists situation text not null default '';
alter table public.contracts add column if not exists tailored jsonb;
