alter table public.logements
  rename column price_cents to price_min_cents;

alter table public.logements
  add column price_max_cents integer;

alter table public.logements
  add constraint logements_price_range_check check (
    price_max_cents is null
    or price_min_cents is null
    or price_min_cents <= price_max_cents
  );
