-- Keep existing school memberships usable as staff, while reserving admin creation
-- and controls for website owners. Separate migration supports already-applied PR40 setup.
begin;
alter function public.platform_admin_dispatch(text,jsonb) set schema private;
revoke all on function private.platform_admin_dispatch(text,jsonb) from public,anon,authenticated;
create function public.platform_admin_dispatch(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 if not private.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
 if p_action='set_member' and p_payload->>'role' is distinct from 'staff' then raise exception 'VALIDATION_ERROR'; end if;
 return private.platform_admin_dispatch(p_action,p_payload);
end $$;
revoke all on function public.platform_admin_dispatch(text,jsonb) from public,anon;
grant execute on function public.platform_admin_dispatch(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
