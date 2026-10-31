-- Permit website owners to upload without artificial school memberships.
-- Safe to repeat in SQL Editor after the existing administration setup.
begin;
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
