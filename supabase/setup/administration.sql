-- LostLink website-owner and school-admin setup (migrations 005 through 009).
-- Copy this WHOLE file into the intended Supabase project's SQL Editor and Run.
-- Requires the existing LostLink foundation/backend/photo migrations.
-- Supports fresh setup and earlier PR40 setup; safe to repeat for the same schema.
-- Does not create users, change passwords, assign owners or remove school data.
-- After success, run the separate bootstrap_platform_admins query for the two
-- existing, confirmed owner email addresses, as described in docs/administration.md.
begin;
do $install_administration$
begin
 -- Source: 202610290005_platform_admin.sql
 if to_regclass('public.platform_admins') is null then
 execute $initial_owner$
-- Website ownership is separate from a school's staff/admin membership.
create table public.platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create function private.is_platform_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.platform_admins where user_id=auth.uid())
$$;
revoke all on function private.is_platform_admin() from public;
grant execute on function private.is_platform_admin() to authenticated;
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon,authenticated;
grant select on public.platform_admins to authenticated;
create policy platform_admin_self on public.platform_admins for select to authenticated using(user_id=auth.uid());

alter table public.organizations
 add column contact_email text not null default '' check(length(contact_email)<=254 and (contact_email='' or contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 add column collection_instructions text not null default '' check(length(collection_instructions)<=1000),
 add column settings_version integer not null default 1 check(settings_version>0);
create table public.platform_admin_events (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null,
 organization_id uuid references public.organizations(id), action text not null,
 target_user_id uuid references auth.users(id) on delete set null,
 details jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);
alter table public.platform_admin_events enable row level security;
revoke all on public.platform_admin_events from anon,authenticated;
grant select on public.platform_admin_events to authenticated;
create policy platform_admin_event_read on public.platform_admin_events for select to authenticated using(private.is_platform_admin());
create index platform_admin_events_time on public.platform_admin_events(occurred_at desc,id);

-- Operator-only initial assignment. Existing confirmed accounts retain their passwords.
-- Deliberately not granted to authenticated: there is no browser self-promotion path.
create function public.bootstrap_platform_admins(p_emails text[]) returns integer
language plpgsql security definer set search_path='' as $$
declare ids uuid[]; existing uuid[];
begin
 if cardinality(p_emails) is distinct from 2 or p_emails[1] is null or p_emails[2] is null
    or lower(trim(p_emails[1]))=lower(trim(p_emails[2])) then raise exception 'TWO_DISTINCT_EMAILS_REQUIRED'; end if;
 perform pg_advisory_xact_lock(61930827);
 select array_agg(id order by id) into ids from auth.users
 where lower(email) in (lower(trim(p_emails[1])),lower(trim(p_emails[2]))) and email_confirmed_at is not null;
 if cardinality(ids) is distinct from 2 then raise exception 'BOTH_ACCOUNTS_MUST_EXIST_AND_BE_CONFIRMED'; end if;
 select array_agg(user_id order by user_id) into existing from public.platform_admins;
 if existing is not null and existing is distinct from ids then raise exception 'OWNERS_ALREADY_CONFIGURED'; end if;
 if existing is null then
  insert into public.platform_admins(user_id) select unnest(ids);
  insert into public.platform_admin_events(action,details) values('owners_bootstrapped',jsonb_build_object('count',2));
 end if;
 return 2;
end $$;
revoke all on function public.bootstrap_platform_admins(text[]) from public,anon,authenticated;
grant execute on function public.bootstrap_platform_admins(text[]) to service_role;

-- Published schools are discovered dynamically; creating one needs no redeploy.
create function public.school_directory() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('data',coalesce(jsonb_agg(jsonb_build_object('id',id,'slug',slug,'name',name,
  'contactEmail',contact_email,'collectionInstructions',collection_instructions,'publicListingEnabled',published) order by name,id),'[]'::jsonb))
 from public.organizations where published or private.is_staff(id)
$$;
revoke all on function public.school_directory() from public;
grant execute on function public.school_directory() to anon,authenticated;

create function public.platform_admin_dispatch(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); org public.organizations%rowtype; target uuid; prior_role text; keys text[]; key text;
begin
 if actor is null then raise exception 'UNAUTHORIZED'; end if;
 if not private.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'VALIDATION_ERROR'; end if;
 keys:=case p_action when 'overview' then array[]::text[]
  when 'create_school' then array['name','slug','timezone','contactEmail','collectionInstructions','published']
  when 'update_school' then array['schoolId','expectedVersion','name','timezone','contactEmail','collectionInstructions','published']
  when 'set_member' then array['schoolId','expectedVersion','email','role']
  when 'remove_member' then array['schoolId','expectedVersion','userId'] else null end;
 if keys is null then raise exception 'VALIDATION_ERROR'; end if;
 for key in select jsonb_object_keys(p_payload) loop
  if not key=any(keys) then raise exception 'VALIDATION_ERROR'; end if;
 end loop;
 if (select count(*) from jsonb_object_keys(p_payload))<>cardinality(keys) then raise exception 'VALIDATION_ERROR'; end if;
 if p_action='overview' then
  return jsonb_build_object(
   'schools',coalesce((select jsonb_agg(to_jsonb(o) order by o.name,o.id) from public.organizations o),'[]'::jsonb),
   'members',coalesce((select jsonb_agg(jsonb_build_object('schoolId',m.organization_id,'userId',m.user_id,'email',u.email,'role',m.role) order by u.email,m.organization_id)
    from public.memberships m join auth.users u on u.id=m.user_id),'[]'::jsonb),
   'owners',coalesce((select jsonb_agg(jsonb_build_object('email',u.email) order by u.email) from public.platform_admins a join auth.users u on u.id=a.user_id),'[]'::jsonb),
   'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.occurred_at desc,e.id) from
    (select a.id,a.organization_id,a.action,a.details,a.occurred_at,u.email as actor_email,t.email as target_email
     from public.platform_admin_events a left join auth.users u on u.id=a.actor_id left join auth.users t on t.id=a.target_user_id
     order by a.occurred_at desc,a.id limit 100) e),'[]'::jsonb));
 end if;
 if p_action in ('create_school','update_school') then
  if jsonb_typeof(p_payload->'name') is distinct from 'string' or length(trim(p_payload->>'name')) not between 1 and 100
   or jsonb_typeof(p_payload->'timezone') is distinct from 'string' or not exists(select 1 from pg_timezone_names where name=p_payload->>'timezone')
   or jsonb_typeof(p_payload->'published') is distinct from 'boolean'
   or jsonb_typeof(p_payload->'contactEmail') is distinct from 'string' or length(p_payload->>'contactEmail')>254
   or (p_payload->>'contactEmail'<>'' and p_payload->>'contactEmail' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
   or jsonb_typeof(p_payload->'collectionInstructions') is distinct from 'string' or length(p_payload->>'collectionInstructions')>1000 then raise exception 'VALIDATION_ERROR'; end if;
 end if;
 if p_action='create_school' then
  if jsonb_typeof(p_payload->'slug') is distinct from 'string' or length(p_payload->>'slug') not between 1 and 63
    or p_payload->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'VALIDATION_ERROR'; end if;
  insert into public.organizations(name,slug,timezone,contact_email,collection_instructions,published)
   values(trim(p_payload->>'name'),p_payload->>'slug',p_payload->>'timezone',p_payload->>'contactEmail',p_payload->>'collectionInstructions',(p_payload->>'published')::boolean)
   returning * into org;
 else
  if jsonb_typeof(p_payload->'schoolId') is distinct from 'string' or p_payload->>'schoolId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or jsonb_typeof(p_payload->'expectedVersion') is distinct from 'number' or p_payload->>'expectedVersion' !~ '^[1-9][0-9]{0,8}$' then raise exception 'VALIDATION_ERROR'; end if;
  select * into org from public.organizations where id=(p_payload->>'schoolId')::uuid for update;
  if org.id is null then raise exception 'NOT_FOUND'; end if;
  if org.settings_version<>(p_payload->>'expectedVersion')::integer then raise exception 'CONFLICT'; end if;
  if p_action='update_school' then
   update public.organizations set name=trim(p_payload->>'name'),timezone=p_payload->>'timezone',contact_email=p_payload->>'contactEmail',
    collection_instructions=p_payload->>'collectionInstructions',published=(p_payload->>'published')::boolean,settings_version=settings_version+1
    where id=org.id returning * into org;
  else
   if p_action='set_member' then
    if jsonb_typeof(p_payload->'email') is distinct from 'string' or length(p_payload->>'email')>254
     or jsonb_typeof(p_payload->'role') is distinct from 'string' or p_payload->>'role' not in ('staff','admin') then raise exception 'VALIDATION_ERROR'; end if;
    select id into target from auth.users where lower(email)=lower(trim(p_payload->>'email')) and email_confirmed_at is not null;
    if target is null then raise exception 'ACCOUNT_NOT_READY'; end if;
    select role into prior_role from public.memberships where organization_id=org.id and user_id=target;
    insert into public.memberships(organization_id,user_id,role) values(org.id,target,p_payload->>'role')
     on conflict(organization_id,user_id) do update set role=excluded.role;
   else
    if jsonb_typeof(p_payload->'userId') is distinct from 'string' or p_payload->>'userId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'VALIDATION_ERROR'; end if;
    target:=(p_payload->>'userId')::uuid;
    delete from public.memberships where organization_id=org.id and user_id=target returning role into prior_role;
    if not found then raise exception 'NOT_FOUND'; end if;
   end if;
   update public.organizations set settings_version=settings_version+1 where id=org.id returning * into org;
  end if;
 end if;
 insert into public.platform_admin_events(actor_id,organization_id,action,target_user_id,details)
  values(actor,org.id,p_action,target,case when p_action in ('set_member','remove_member') then jsonb_build_object('previousRole',prior_role,'role',p_payload->>'role')
   else jsonb_build_object('name',org.name,'published',org.published,'version',org.settings_version) end);
 return jsonb_build_object('schoolId',org.id);
end $$;
revoke all on function public.platform_admin_dispatch(text,jsonb) from public,anon;
grant execute on function public.platform_admin_dispatch(text,jsonb) to authenticated;

-- Existing claim projections retain privacy boundaries and now use school settings.
create or replace function private.backend_claim_json(target uuid, staff boolean default false) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',c.id,'itemId',c.item_id,'organizationSlug',o.slug,'itemTitle',i.title,'status',c.status,'evidenceText',c.evidence_text,'submittedAt',c.submitted_at,'reviewedAt',c.reviewed_at,'decisionReason',c.decision_reason,'claimantReason',c.claimant_reason,'closedAt',c.closed_at,'evidenceDeletedAt',c.evidence_deleted_at,'version',c.version,'collectionInstructions',nullif(o.collection_instructions,''))
 || case when staff then jsonb_build_object('claimantId',c.claimant_id,'reviewedBy',c.reviewed_by,'privateReviewNote',c.private_review_note) else '{}'::jsonb end
 from public.claims c join public.organizations o on o.id=c.organization_id join public.items i on i.id=c.item_id and i.organization_id=c.organization_id where c.id=target
$$;

$initial_owner$;
 end if;
 -- Source: 202610290006_owner_only_administration.sql
 if to_regprocedure('private.platform_admin_dispatch(text,jsonb)') is null then
 execute $owner_wrapper$
-- Keep existing school memberships usable as staff, while reserving admin creation
-- and controls for website owners. Separate migration supports already-applied PR40 setup.
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

$owner_wrapper$;
 end if;
 -- Source: 202610290007_school_admin_scope.sql
 if to_regprocedure('public.school_admin_dispatch(text,text,jsonb)') is null then
 execute $school_scope$
-- Two administration levels: website owners everywhere; school admins in their own school.
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

$school_scope$;
 end if;
end $install_administration$;
-- Source: 202610300008_owner_school_deletion.sql
create table if not exists public.school_photo_cleanup (
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

-- Source: 202610310009_owner_photo_uploads.sql
-- Owner uploads use the verified p_actor, not the processor's auth.uid().
-- Preserve school scope, item state, creator, quota, cap and integrity checks.
create or replace function public.photo_begin(p_actor uuid,p_org_slug text,p_item_id uuid,p_photo_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare org uuid; item public.items%rowtype; photo public.item_photos%rowtype; path text; req uuid:=gen_random_uuid();
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if p_actor is null or p_item_id is null or p_photo_id is null or p_org_slug is null then raise exception 'VALIDATION_ERROR'; end if;
 select id into org from public.organizations where slug=p_org_slug;
 if org is null or not (exists(select 1 from public.platform_admins where user_id=p_actor)
  or exists(select 1 from public.memberships where organization_id=org and user_id=p_actor and role in ('staff','admin'))) then raise exception 'NOT_FOUND'; end if;
 -- Across all organizations: aborted and failed processing reservations still consume quota.
 perform pg_advisory_xact_lock(hashtextextended('lostlink:photos:'||p_actor::text,0));
 select * into item from public.items where id=p_item_id and organization_id=org for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if item.status<>'available' then raise exception 'CONFLICT'; end if;
 select * into photo from public.item_photos where id=p_photo_id;
 if found then
  if photo.organization_id=org and photo.item_id=p_item_id and photo.created_by=p_actor and photo.status='processing' then
   return jsonb_build_object('data',jsonb_build_object('id',photo.id,'status',photo.status,'storagePath',photo.storage_path));
  end if;
  raise exception 'CONFLICT';
 end if;
 if (select count(*) from public.audit_events where actor_id=p_actor and action='photo_upload_reserved' and occurred_at>=now()-interval '1 hour')>=20 then raise exception 'RATE_LIMITED'; end if;
 if (select count(*) from public.item_photos where item_id=p_item_id and organization_id=org)>=3 then raise exception 'CONFLICT'; end if;
 path:=org::text||'/'||p_item_id::text||'/'||p_photo_id::text||'.webp';
 insert into public.item_photos(id,organization_id,item_id,storage_path,status,created_by) values(p_photo_id,org,p_item_id,path,'processing',p_actor);
 insert into public.audit_events(organization_id,actor_id,action,entity_type,entity_id,request_id,new_status) values(org,p_actor,'photo_upload_reserved','photo',p_photo_id,req,'processing');
 return jsonb_build_object('data',jsonb_build_object('id',p_photo_id,'status','processing','storagePath',path));
end $$;

create or replace function public.photo_finish(p_actor uuid,p_org_slug text,p_item_id uuid,p_photo_id uuid,p_sha256 text,p_bytes integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare org uuid; item public.items%rowtype; photo public.item_photos%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if p_actor is null or p_sha256 is null or p_sha256!~'^[0-9a-f]{64}$' or p_bytes is null or p_bytes not between 1 and 4194304 then raise exception 'VALIDATION_ERROR'; end if;
 select id into org from public.organizations where slug=p_org_slug;
 if org is null or not (exists(select 1 from public.platform_admins where user_id=p_actor)
  or exists(select 1 from public.memberships where organization_id=org and user_id=p_actor and role in ('staff','admin'))) then raise exception 'NOT_FOUND'; end if;
 select * into item from public.items where id=p_item_id and organization_id=org for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into photo from public.item_photos where id=p_photo_id and organization_id=org and item_id=p_item_id and created_by=p_actor for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if item.status<>'available' then raise exception 'CONFLICT'; end if;
 if photo.status='pending' and photo.sha256=p_sha256 and photo.byte_size=p_bytes and private.photo_verified(photo) then return jsonb_build_object('data',jsonb_build_object('id',photo.id,'status','pending')); end if;
 if photo.status<>'processing' then raise exception 'CONFLICT'; end if;
 -- Storage metadata is written by the trusted upload route after re-encoding. Verify
 -- presence and provider metadata as well as caller-supplied hash/length before exposure.
 if not exists(select 1 from storage.objects where bucket_id='item-public' and name=photo.storage_path and metadata->>'mimetype'='image/webp' and (metadata->>'size')::bigint=p_bytes) then raise exception 'CONFLICT'; end if;
 update public.item_photos set status='pending',sha256=p_sha256,byte_size=p_bytes,content_type='image/webp',processed_at=now() where id=photo.id;
 insert into public.audit_events(organization_id,actor_id,action,entity_type,entity_id,request_id,previous_status,new_status) values(org,p_actor,'photo_processed','photo',photo.id,gen_random_uuid(),'processing','pending');
 return jsonb_build_object('data',jsonb_build_object('id',photo.id,'status','pending'));
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'VALIDATION_ERROR';
end $$;

revoke all on function public.photo_begin(uuid,text,uuid,uuid),public.photo_finish(uuid,text,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.photo_begin(uuid,text,uuid,uuid),public.photo_finish(uuid,text,uuid,uuid,text,integer) to service_role;
notify pgrst, 'reload schema';
commit;
