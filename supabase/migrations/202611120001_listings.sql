begin;
create table public.listings (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  primary key (owner_id, id)
);
alter table public.listings enable row level security;
revoke all on public.listings from anon;
grant select, insert, update, delete on public.listings to authenticated;
create policy own_listings on public.listings for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Restore is atomic: an invalid backup never leaves a partially replaced collection.
create function public.restore_listings(items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if jsonb_typeof(items) is distinct from 'array' then raise exception 'Expected array'; end if;
  delete from public.listings where owner_id = auth.uid();
  insert into public.listings (owner_id, id, data)
    select auth.uid(), item->>'id', item from jsonb_array_elements(items) as item;
end;
$$;
revoke all on function public.restore_listings(jsonb) from public, anon;
grant execute on function public.restore_listings(jsonb) to authenticated;
commit;
