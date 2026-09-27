create table public.logements (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'crous',
  source_key text not null,
  city text not null check (char_length(btrim(city)) between 1 and 120),
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  residence text not null check (char_length(btrim(residence)) between 1 and 200),
  housing_type text not null check (housing_type in ('chambre', 'studio')),
  price_cents integer check (price_cents is null or price_cents >= 0),
  surface_m2 numeric(7,2) check (surface_m2 is null or surface_m2 >= 0),
  address text,
  url text not null,
  available boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint logements_source_key_unique unique (source, source_key)
);

create index logements_location_idx
  on public.logements (city, postal_code);

create index logements_available_idx
  on public.logements (available)
  where available = true;

create table public.alertes (
  id uuid primary key default gen_random_uuid(),
  surveillance_id uuid not null references public.surveillances(id) on delete cascade,
  logement_id uuid not null references public.logements(id) on delete cascade,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint alertes_surveillance_logement_unique unique (surveillance_id, logement_id)
);

create index alertes_surveillance_idx
  on public.alertes (surveillance_id, sent_at desc);

create index alertes_logement_idx
  on public.alertes (logement_id);

alter table public.logements enable row level security;
alter table public.alertes enable row level security;

grant select on public.logements to authenticated;
grant select on public.alertes to authenticated;

create policy "Un utilisateur voit les logements de ses alertes"
on public.logements for select
to authenticated
using (
  exists (
    select 1
    from public.alertes a
    join public.surveillances s on s.id = a.surveillance_id
    where a.logement_id = logements.id
      and s.user_id = auth.uid()
  )
);

create policy "Un utilisateur voit ses alertes"
on public.alertes for select
to authenticated
using (
  exists (
    select 1
    from public.surveillances s
    where s.id = alertes.surveillance_id
      and s.user_id = auth.uid()
  )
);
