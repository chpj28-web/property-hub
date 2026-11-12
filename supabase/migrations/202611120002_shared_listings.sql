-- Run this entire file in Supabase SQL Editor. Safe to run again.
-- Anyone with the public app can read and edit this shared collection.
-- Existing private listings remain in their original table.
begin;
create table if not exists public.shared_listings (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);
alter table public.shared_listings enable row level security;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.shared_listings to anon, authenticated;
drop policy if exists shared_workspace on public.shared_listings;
create policy shared_workspace on public.shared_listings for all to anon, authenticated
  using (true) with check (true);
create or replace function public.restore_shared_listings(items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(items) is distinct from 'array' then raise exception 'Expected array'; end if;
  perform pg_advisory_xact_lock(721120002);
  delete from public.shared_listings;
  insert into public.shared_listings (id, data)
    select item->>'id', item from jsonb_array_elements(items) as item;
end;
$$;
revoke all on function public.restore_shared_listings(jsonb) from public;
grant execute on function public.restore_shared_listings(jsonb) to anon, authenticated;
commit;
