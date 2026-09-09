create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_approved_admin() then
    raise exception 'Accès administrateur requis';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Un administrateur ne peut pas supprimer son propre compte';
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
