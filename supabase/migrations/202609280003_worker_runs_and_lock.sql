create table public.worker_runs (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  status text not null check (status in ('running', 'completed', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  watches integer not null default 0,
  listings_seen integer not null default 0,
  listings_matched integer not null default 0,
  alerts_created integer not null default 0,
  error text
);

create table public.worker_locks (
  lock_name text primary key,
  owner text not null,
  acquired_at timestamptz not null default now()
);

create or replace function public.acquire_worker_lock(
  requested_lock_name text,
  requested_owner text,
  ttl_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  acquired boolean := false;
begin
  insert into public.worker_locks (lock_name, owner, acquired_at)
  values (requested_lock_name, requested_owner, now())
  on conflict (lock_name) do update
    set owner = excluded.owner, acquired_at = excluded.acquired_at
    where public.worker_locks.acquired_at < now() - make_interval(secs => ttl_seconds)
  returning true into acquired;
  return coalesce(acquired, false);
end;
$$;

create or replace function public.release_worker_lock(
  requested_lock_name text,
  requested_owner text
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.worker_locks
  where lock_name = requested_lock_name and owner = requested_owner;
$$;

revoke all on table public.worker_runs, public.worker_locks from public, anon, authenticated;
grant select, insert, update, delete on table public.worker_runs, public.worker_locks to service_role;
revoke all on function public.acquire_worker_lock(text, text, integer) from public, anon, authenticated;
revoke all on function public.release_worker_lock(text, text) from public, anon, authenticated;
grant execute on function public.acquire_worker_lock(text, text, integer) to service_role;
grant execute on function public.release_worker_lock(text, text) to service_role;
