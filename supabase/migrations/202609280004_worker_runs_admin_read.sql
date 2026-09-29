alter table public.worker_runs enable row level security;

grant select on public.worker_runs to authenticated;

create policy "Un administrateur approuvé peut lire les cycles worker"
on public.worker_runs for select
to authenticated
using (public.is_approved_admin());
