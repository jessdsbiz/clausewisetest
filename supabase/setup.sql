-- ClauseWise: run this once in Supabase -> SQL Editor -> New query -> Run.
-- Creates the contracts table and a private storage bucket for uploaded files.
-- Fields match REQUIREMENTS.md section 3.

create table if not exists public.contracts (
  id            uuid primary key default gen_random_uuid(),
  device_id     text not null,
  created_at    timestamptz not null default now(),
  title         text not null,
  contract_type text not null check (contract_type in ('job_offer','rental','phone_subscription','loan','business','other')),
  explain_mode  text not null check (explain_mode in ('plain','comic','audio')),
  language      text not null check (language in ('en','zh','ms','ta')),
  source_type   text not null check (source_type in ('pdf','photo')),
  file_path     text not null default '', -- '' = original file not stored (all new uploads)
  file_name     text not null,
  mime_type     text not null,
  raw_text      text,
  clauses       jsonb,
  summary       jsonb,
  risks         jsonb,
  comics        jsonb not null default '[]'::jsonb,
  chat          jsonb not null default '[]'::jsonb,
  translations  jsonb not null default '{}'::jsonb,
  personal      jsonb, -- Personal details screen: what was hidden, what else was found, "Hide these too"
  situation     text not null default '', -- "Tell us about you", masked like raw_text
  tailored      jsonb, -- "Your situation": summary order, "Why this matters for you" lines, plan
  decisions     jsonb, -- "You decide": marks on warnings, draft message, chosen option
  status        text not null default 'uploaded' check (status in ('uploaded','processing','ready','error'))
);

create index if not exists contracts_device_created_idx
  on public.contracts (device_id, created_at desc);

-- Row Level Security on with NO policies: the public anon key can't read or write anything.
-- Only the Netlify Functions (using the service role key from .env) can reach this table.
alter table public.contracts enable row level security;

-- Private bucket for original PDFs and photos. New uploads no longer store the original file
-- (only masked text is saved); the bucket only holds files from older uploads until deleted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contracts', 'contracts', false, 5242880,
        array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
