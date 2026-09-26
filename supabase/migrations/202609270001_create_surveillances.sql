create table public.surveillances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  city text not null check (char_length(btrim(city)) between 1 and 120),
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  housing_type text not null check (housing_type in ('chambre', 'studio')),
  min_price_cents integer check (min_price_cents is null or min_price_cents >= 0),
  max_price_cents integer check (max_price_cents is null or max_price_cents >= 0),
  status text not null default 'active' check (status in ('active', 'paused')),
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint surveillances_price_range_check check (
    min_price_cents is null
    or max_price_cents is null
    or min_price_cents <= max_price_cents
  )
);

create index surveillances_active_idx
  on public.surveillances (status)
  where status = 'active';

create index surveillances_user_id_idx
  on public.surveillances (user_id);

alter table public.surveillances enable row level security;

grant select, insert, update, delete on public.surveillances to authenticated;

create policy "Un utilisateur approuvé peut lire ses surveillances"
on public.surveillances for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  )
);

create policy "Un utilisateur approuvé peut créer ses surveillances"
on public.surveillances for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  )
);

create policy "Un utilisateur approuvé peut modifier ses surveillances"
on public.surveillances for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  )
);

create policy "Un utilisateur approuvé peut supprimer ses surveillances"
on public.surveillances for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  )
);
