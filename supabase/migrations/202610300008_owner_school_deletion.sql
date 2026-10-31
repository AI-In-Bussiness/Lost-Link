-- Permanent school deletion is restricted to the existing website owners.
begin;
create table public.school_photo_cleanup (
 bucket_id text not null check(bucket_id in ('item-public','item-staging')),
 storage_path text not null check(storage_path ~ '^[0-9a-f-]{36}/'),
 primary key(bucket_id,storage_path)
);
alter table public.school_photo_cleanup enable row level security;
revoke all on public.school_photo_cleanup from public,anon,authenticated;
grant select,insert,delete on public.school_photo_cleanup to service_role;

create or replace function public.platform_admin_dispatch(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare org public.organizations%rowtype; result jsonb;
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 if not private.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
 if p_action='delete_school' then
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'VALIDATION_ERROR'; end if;
  if not (p_payload ?& array['schoolId','expectedVersion','schoolSlug','confirm'])
   or (select count(*) from jsonb_object_keys(p_payload))<>4
   or jsonb_typeof(p_payload->'schoolId') is distinct from 'string'
   or p_payload->>'schoolId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or jsonb_typeof(p_payload->'expectedVersion') is distinct from 'number'
   or p_payload->>'expectedVersion' !~ '^[1-9][0-9]{0,8}$'
   or jsonb_typeof(p_payload->'schoolSlug') is distinct from 'string'
   or p_payload->>'confirm' is distinct from 'delete' then raise exception 'VALIDATION_ERROR'; end if;
  select * into org from public.organizations where id=(p_payload->>'schoolId')::uuid for update;
  if org.id is null then raise exception 'NOT_FOUND'; end if;
  if org.settings_version<>(p_payload->>'expectedVersion')::integer then raise exception 'CONFLICT'; end if;
  if org.slug is distinct from p_payload->>'schoolSlug' then raise exception 'VALIDATION_ERROR'; end if;
  -- Keep a durable outbox before removing photo metadata. Use Storage's API to
  -- remove bytes; deleting storage.objects directly would orphan the files.
  insert into public.school_photo_cleanup(bucket_id,storage_path)
   select 'item-public',storage_path from public.item_photos where organization_id=org.id
   union select bucket_id,name from storage.objects
    where bucket_id in ('item-public','item-staging') and name like org.id::text||'/%'
   on conflict do nothing;
  delete from public.claims where organization_id=org.id;
  delete from public.items where organization_id=org.id;
  delete from public.audit_events where organization_id=org.id;
  delete from public.memberships where organization_id=org.id;
  delete from public.platform_admin_events where organization_id=org.id;
  delete from public.organizations where id=org.id;
  -- Retain only an owner-visible deletion receipt, with no item/claim contents.
  insert into public.platform_admin_events(actor_id,action,details)
   values(auth.uid(),'delete_school',jsonb_build_object('schoolId',org.id,'name',org.name,'slug',org.slug));
  return jsonb_build_object('schoolId',org.id,'photoCleanupPending',exists(select 1 from public.school_photo_cleanup));
 end if;
 result:=private.platform_admin_dispatch(p_action,p_payload);
 if p_action='overview' then
  result:=result||jsonb_build_object('photoCleanupPending',exists(select 1 from public.school_photo_cleanup));
 end if;
 return result;
end $$;
revoke all on function public.platform_admin_dispatch(text,jsonb) from public,anon;
grant execute on function public.platform_admin_dispatch(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
