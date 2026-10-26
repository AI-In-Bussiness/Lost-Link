-- Narrow service-role exception: verified server processor reserves/uploads sanitized
-- derivatives only. User inventory/claims remain caller-scoped. Originals are never stored.
begin;
-- Vercel functions allow 4.5 MB request/response bodies. A 4 MiB ceiling
-- narrows Phase 0's 5 MiB maximum so both upload and mediated download fit.
update storage.buckets set file_size_limit=4194304 where id='item-public';
alter table public.item_photos drop constraint item_photos_status_check;
alter table public.item_photos add constraint item_photos_status_check check(status in ('processing','pending','published'));
alter table public.item_photos add column sha256 text check(sha256 ~ '^[0-9a-f]{64}$');
alter table public.item_photos add column byte_size integer check(byte_size between 1 and 4194304);
alter table public.item_photos add column content_type text check(content_type='image/webp');
alter table public.item_photos add column processed_at timestamptz;
alter table public.item_photos add column published_at timestamptz;
alter table public.item_photos add column reviewed_by uuid references auth.users(id);
-- Existing unverified metadata never becomes public merely because its old status said published.
update public.item_photos set status='pending' where status='published';
create index audit_photo_upload_rate on public.audit_events(actor_id,occurred_at) where action='photo_upload_reserved';

create function private.photo_verified(photo public.item_photos) returns boolean language sql immutable set search_path='' as $$
 select coalesce(photo.sha256 is not null and photo.byte_size between 1 and 4194304 and photo.content_type='image/webp' and photo.processed_at is not null,false)
$$;
revoke all on function private.photo_verified(public.item_photos) from public,anon,authenticated;

create or replace function private.can_read_photo(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.item_photos p join public.items i on i.id=p.item_id and i.organization_id=p.organization_id join public.organizations o on o.id=i.organization_id
 where p.storage_path=object_name and p.status='published' and i.status='available' and o.published and private.photo_verified(p))
$$;
create function private.staff_can_read_photo(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.item_photos p where p.storage_path=object_name and p.status in ('pending','published') and private.photo_verified(p) and private.is_staff(p.organization_id))
$$;
revoke all on function private.staff_can_read_photo(text) from public;
grant execute on function private.staff_can_read_photo(text) to authenticated;
create policy sanitized_staff_preview on storage.objects for select to authenticated using(bucket_id='item-public' and private.staff_can_read_photo(name));
-- Phase 1 staging uploads are no longer a supported ingress: client objects may not
-- evade the processor/quota by posting unsanitized originals to another bucket.
drop policy staging_staff_insert on storage.objects;

create function public.photo_begin(p_actor uuid,p_org_slug text,p_item_id uuid,p_photo_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare org uuid; item public.items%rowtype; photo public.item_photos%rowtype; path text; req uuid:=gen_random_uuid();
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if p_actor is null or p_item_id is null or p_photo_id is null or p_org_slug is null then raise exception 'VALIDATION_ERROR'; end if;
 select id into org from public.organizations where slug=p_org_slug;
 if org is null or not exists(select 1 from public.memberships where organization_id=org and user_id=p_actor and role in ('staff','admin')) then raise exception 'NOT_FOUND'; end if;
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

create function public.photo_finish(p_actor uuid,p_org_slug text,p_item_id uuid,p_photo_id uuid,p_sha256 text,p_bytes integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare org uuid; item public.items%rowtype; photo public.item_photos%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 if p_actor is null or p_sha256 is null or p_sha256!~'^[0-9a-f]{64}$' or p_bytes is null or p_bytes not between 1 and 4194304 then raise exception 'VALIDATION_ERROR'; end if;
 select id into org from public.organizations where slug=p_org_slug;
 if org is null or not exists(select 1 from public.memberships where organization_id=org and user_id=p_actor and role in ('staff','admin')) then raise exception 'NOT_FOUND'; end if;
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

create function public.photo_abort(p_actor uuid,p_org_slug text,p_item_id uuid,p_photo_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare org uuid; photo public.item_photos%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'FORBIDDEN'; end if;
 select id into org from public.organizations where slug=p_org_slug;
 if org is null then raise exception 'NOT_FOUND'; end if;
 perform 1 from public.items where id=p_item_id and organization_id=org for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into photo from public.item_photos where id=p_photo_id and organization_id=org and item_id=p_item_id and created_by=p_actor for update;
 if not found then return jsonb_build_object('data',jsonb_build_object('id',p_photo_id,'status','aborted')); end if;
 if photo.status<>'processing' then raise exception 'CONFLICT'; end if;
 -- Revoked membership must not prevent trusted cleanup of its own unfinished upload.
 delete from public.item_photos where id=photo.id;
 insert into public.audit_events(organization_id,actor_id,action,entity_type,entity_id,request_id,previous_status,new_status) values(org,p_actor,'photo_aborted','photo',photo.id,gen_random_uuid(),'processing','aborted');
 return jsonb_build_object('data',jsonb_build_object('id',p_photo_id,'status','aborted'));
end $$;

create function public.photo_publish(p_org_slug text,p_item_id uuid,p_photo_id uuid,p_reviewed boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); org uuid; item public.items%rowtype; photo public.item_photos%rowtype;
begin
 if actor is null then raise exception 'UNAUTHORIZED'; end if;
 if p_reviewed is distinct from true then raise exception 'VALIDATION_ERROR'; end if;
 select id into org from public.organizations where slug=p_org_slug;
 if org is null or not private.is_staff(org) then raise exception 'NOT_FOUND'; end if;
 select * into item from public.items where id=p_item_id and organization_id=org for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into photo from public.item_photos where id=p_photo_id and organization_id=org and item_id=p_item_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if item.status<>'available' or photo.status not in ('pending','published') or not private.photo_verified(photo) then raise exception 'CONFLICT'; end if;
 if not exists(select 1 from storage.objects where bucket_id='item-public' and name=photo.storage_path) then raise exception 'CONFLICT'; end if;
 if photo.status='published' then return jsonb_build_object('data',jsonb_build_object('id',photo.id,'status','published')); end if;
 update public.item_photos set status='published',published_at=now(),reviewed_by=actor where id=photo.id;
 perform private.backend_audit(org,'photo',photo.id,'photo_published','pending','published',gen_random_uuid());
 return jsonb_build_object('data',jsonb_build_object('id',photo.id,'status','published'));
end $$;

create function private.photo_json(p public.item_photos,org_slug text,title text) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',p.id,'status',p.status,'storagePath',p.storage_path,'sha256',p.sha256,'bytes',p.byte_size,'contentType',p.content_type,'alt',title,'url','/api/v1/organizations/'||org_slug||'/items/'||p.item_id::text||'/photos/'||p.id::text||'/content')
$$;
revoke all on function private.photo_json(public.item_photos,text,text) from public,anon,authenticated;
create function public.photo_metadata(p_org_slug text,p_item_id uuid,p_photo_id uuid,p_staff boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare org public.organizations%rowtype; item public.items%rowtype; photo public.item_photos%rowtype;
begin
 select * into org from public.organizations where slug=p_org_slug;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_staff is null then raise exception 'VALIDATION_ERROR'; end if;
 if p_staff and (auth.uid() is null or not private.is_staff(org.id)) then raise exception 'NOT_FOUND'; end if;
 select * into item from public.items where id=p_item_id and organization_id=org.id;
 if not found or (not p_staff and (not org.published or item.status<>'available')) then raise exception 'NOT_FOUND'; end if;
 select * into photo from public.item_photos where id=p_photo_id and organization_id=org.id and item_id=item.id;
 if not found or photo.status='processing' or (not p_staff and photo.status<>'published') or not private.photo_verified(photo) then raise exception 'NOT_FOUND'; end if;
 return jsonb_build_object('data',private.photo_json(photo,org.slug,item.title));
end $$;
create function public.photo_list(p_org_slug text,p_item_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare org uuid; item public.items%rowtype; rows jsonb;
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 select id into org from public.organizations where slug=p_org_slug;
 if org is null or not private.is_staff(org) then raise exception 'NOT_FOUND'; end if;
 select * into item from public.items where id=p_item_id and organization_id=org;
 if not found then raise exception 'NOT_FOUND'; end if;
 select coalesce(jsonb_agg(private.photo_json(p,p_org_slug,item.title) order by p.id),'[]'::jsonb) into rows from public.item_photos p where p.organization_id=org and p.item_id=item.id and p.status in ('pending','published') and private.photo_verified(p);
 return jsonb_build_object('data',rows);
end $$;

create or replace function private.backend_item_json(target uuid, staff boolean default false) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',i.id,'organizationSlug',o.slug,'title',i.title,'publicDescription',i.public_description,'category',i.category,'color',i.color,'publicLocation',i.public_location,'foundDate',i.found_date,
 'photos',coalesce((select jsonb_agg(jsonb_build_object('url','/api/v1/organizations/'||o.slug||'/items/'||i.id::text||'/photos/'||p.id::text||'/content','alt',i.title) order by p.id) from public.item_photos p where p.item_id=i.id and p.organization_id=i.organization_id and p.status='published' and private.photo_verified(p) and i.status='available' and o.published),'[]'::jsonb))
 || case when staff then jsonb_build_object('status',i.status,'identifyingDetails',d.identifying_details,'storageLocation',d.storage_location,'version',i.version,'createdAt',i.created_at,'updatedAt',i.updated_at) else '{}'::jsonb end
 from public.items i join public.organizations o on o.id=i.organization_id left join public.item_private_details d on d.item_id=i.id and d.organization_id=i.organization_id where i.id=target
$$;
create or replace function public.list_public_items(org_slug text, page_size integer default 20)
returns table(id uuid,organization_slug text,title text,public_description text,category text,color text,public_location text,found_date date,photos jsonb)
language sql stable security definer set search_path='' as $$
 select i.id,o.slug,i.title,i.public_description,i.category,i.color,i.public_location,i.found_date,
 coalesce((select jsonb_agg(jsonb_build_object('path',p.storage_path,'alt',i.title) order by p.id) from public.item_photos p where p.organization_id=i.organization_id and p.item_id=i.id and p.status='published' and private.photo_verified(p)),'[]'::jsonb)
 from public.items i join public.organizations o on o.id=i.organization_id
 where o.slug=org_slug and o.published and i.status='available'
 order by i.found_date desc,i.id limit least(greatest(coalesce(page_size,20),1),50)
$$;
revoke all on function public.photo_begin(uuid,text,uuid,uuid),public.photo_finish(uuid,text,uuid,uuid,text,integer),public.photo_abort(uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.photo_begin(uuid,text,uuid,uuid),public.photo_finish(uuid,text,uuid,uuid,text,integer),public.photo_abort(uuid,text,uuid,uuid) to service_role;
revoke all on function public.photo_publish(text,uuid,uuid,boolean),public.photo_metadata(text,uuid,uuid,boolean),public.photo_list(text,uuid) from public;
grant execute on function public.photo_publish(text,uuid,uuid,boolean),public.photo_list(text,uuid) to authenticated;
grant execute on function public.photo_metadata(text,uuid,uuid,boolean) to anon,authenticated;
commit;
