create table if not exists public.capsules (
  slug text primary key,
  pata_handle text not null,
  address_title text not null,
  macro_anchor text not null,
  voice_note_hindi text default '',
  phone_hash text,
  waypoints jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_capsules_phone_hash
  on public.capsules (phone_hash)
  where phone_hash is not null;

alter table public.capsules enable row level security;

drop policy if exists "Public read capsules" on public.capsules;
create policy "Public read capsules"
  on public.capsules for select
  to anon, authenticated
  using (true);

drop policy if exists "Public insert capsules" on public.capsules;
create policy "Public insert capsules"
  on public.capsules for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public update capsules" on public.capsules;
create policy "Public update capsules"
  on public.capsules for update
  to anon, authenticated
  using (true)
  with check (true);
