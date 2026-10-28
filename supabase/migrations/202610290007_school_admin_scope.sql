-- Two administration levels: website owners everywhere; school admins in their own school.
begin;
create or replace function private.is_staff(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_platform_admin() or exists(select 1 from public.memberships m where m.organization_id=org and m.user_id=auth.uid() and m.role in ('staff','admin'))
$$;
create or replace function public.platform_admin_dispatch(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 if not private.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
 return private.platform_admin_dispatch(p_action,p_payload);
end $$;
-- School-admin operations bind to the school in the route, never to a caller-selected scope.
create function public.school_admin_dispatch(p_action text,p_org_slug text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare org public.organizations%rowtype; actor uuid:=auth.uid(); target uuid; prior_role text; allowed text[]; key text; owner boolean:=private.is_platform_admin();
begin
 if actor is null then raise exception 'UNAUTHORIZED'; end if;
 select * into org from public.organizations where slug=p_org_slug for update;
 if org.id is null or not (owner or exists(select 1 from public.memberships where organization_id=org.id and user_id=actor and role='admin')) then raise exception 'NOT_FOUND'; end if;
 allowed:=case p_action when 'overview' then array[]::text[]
  when 'update_school' then array['schoolId','expectedVersion','name','timezone','contactEmail','collectionInstructions','published']
  when 'set_member' then array['schoolId','expectedVersion','email','role']
  when 'remove_member' then array['schoolId','expectedVersion','userId'] else null end;
 if allowed is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'VALIDATION_ERROR'; end if;
 for key in select jsonb_object_keys(p_payload) loop if not key=any(allowed) then raise exception 'VALIDATION_ERROR'; end if; end loop;
 if (select count(*) from jsonb_object_keys(p_payload))<>cardinality(allowed) then raise exception 'VALIDATION_ERROR'; end if;
 if p_action='overview' then
  return jsonb_build_object('schools',jsonb_build_array(to_jsonb(org)),
   'members',coalesce((select jsonb_agg(jsonb_build_object('schoolId',m.organization_id,'userId',m.user_id,'email',u.email,'role',m.role) order by u.email) from public.memberships m join auth.users u on u.id=m.user_id where m.organization_id=org.id),'[]'::jsonb),
   'owners','[]'::jsonb,
   'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.occurred_at desc,e.id) from
    (select a.id,a.organization_id,a.action,a.details,a.occurred_at,u.email as actor_email,t.email as target_email from public.platform_admin_events a
     left join auth.users u on u.id=a.actor_id left join auth.users t on t.id=a.target_user_id where a.organization_id=org.id order by a.occurred_at desc,a.id limit 100) e),'[]'::jsonb));
 end if;
 if p_payload->>'schoolId' is distinct from org.id::text then raise exception 'NOT_FOUND'; end if;
 if jsonb_typeof(p_payload->'expectedVersion') is distinct from 'number' or p_payload->>'expectedVersion' !~ '^[1-9][0-9]{0,8}$' then raise exception 'VALIDATION_ERROR'; end if;
 if org.settings_version<>(p_payload->>'expectedVersion')::integer then raise exception 'CONFLICT'; end if;
 if p_action='update_school' then
  if jsonb_typeof(p_payload->'name') is distinct from 'string' or length(trim(p_payload->>'name')) not between 1 and 100
   or jsonb_typeof(p_payload->'timezone') is distinct from 'string' or not exists(select 1 from pg_timezone_names where name=p_payload->>'timezone')
   or jsonb_typeof(p_payload->'published') is distinct from 'boolean'
   or jsonb_typeof(p_payload->'contactEmail') is distinct from 'string' or length(p_payload->>'contactEmail')>254
   or (p_payload->>'contactEmail'<>'' and p_payload->>'contactEmail' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
   or jsonb_typeof(p_payload->'collectionInstructions') is distinct from 'string' or length(p_payload->>'collectionInstructions')>1000 then raise exception 'VALIDATION_ERROR'; end if;
  update public.organizations set name=trim(p_payload->>'name'),timezone=p_payload->>'timezone',contact_email=p_payload->>'contactEmail',
   collection_instructions=p_payload->>'collectionInstructions',published=(p_payload->>'published')::boolean,settings_version=settings_version+1 where id=org.id;
 else
  if p_action='set_member' then
   if jsonb_typeof(p_payload->'email') is distinct from 'string' or length(p_payload->>'email')>254 or jsonb_typeof(p_payload->'role') is distinct from 'string' or p_payload->>'role' not in ('staff','admin') then raise exception 'VALIDATION_ERROR'; end if;
   select id into target from auth.users where lower(email)=lower(trim(p_payload->>'email')) and email_confirmed_at is not null;
   if target is null then raise exception 'ACCOUNT_NOT_READY'; end if;
  else
   if jsonb_typeof(p_payload->'userId') is distinct from 'string' or p_payload->>'userId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'VALIDATION_ERROR'; end if;
   target:=(p_payload->>'userId')::uuid;
  end if;
  select role into prior_role from public.memberships where organization_id=org.id and user_id=target;
  if not owner and prior_role='admin' and (p_action='remove_member' or p_payload->>'role'='staff') and (select count(*) from public.memberships where organization_id=org.id and role='admin')<2 then raise exception 'LAST_SCHOOL_ADMIN'; end if;
  if p_action='set_member' then
   insert into public.memberships(organization_id,user_id,role) values(org.id,target,p_payload->>'role') on conflict(organization_id,user_id) do update set role=excluded.role;
  else
   delete from public.memberships where organization_id=org.id and user_id=target;
   if not found then raise exception 'NOT_FOUND'; end if;
  end if;
  update public.organizations set settings_version=settings_version+1 where id=org.id;
 end if;
 insert into public.platform_admin_events(actor_id,organization_id,action,target_user_id,details) values(actor,org.id,p_action,target,
  jsonb_build_object('scope','school','previousRole',prior_role,'role',p_payload->>'role'));
 return jsonb_build_object('schoolId',org.id);
end $$;
revoke all on function public.school_admin_dispatch(text,text,jsonb) from public,anon;
grant execute on function public.school_admin_dispatch(text,text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
