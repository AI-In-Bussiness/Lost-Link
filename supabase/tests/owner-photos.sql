\set ON_ERROR_STOP on
begin;
-- Fictional, membership-free owners. The entire suite rolls back.
insert into auth.users(id,email,email_confirmed_at) values
 ('98000000-0000-4000-8000-000000000001','photo-owner-one@example.test',now()),
 ('98000000-0000-4000-8000-000000000002','photo-owner-two@example.test',now()),
 ('98000000-0000-4000-8000-000000000003','photo-school-staff@example.test',now()),
 ('98000000-0000-4000-8000-000000000004','photo-foreign-staff@example.test',now()),
 ('98000000-0000-4000-8000-000000000005','photo-claimant@example.test',now());
insert into public.platform_admins(user_id) values
 ('98000000-0000-4000-8000-000000000001'),('98000000-0000-4000-8000-000000000002');
insert into public.organizations(id,slug,name,published) values
 ('18000000-0000-4000-8000-000000000001','photo-owner-public','Fictional Public Photo School',true),
 ('18000000-0000-4000-8000-000000000002','photo-owner-hidden','Fictional Hidden Photo School',false);
insert into public.memberships(organization_id,user_id,role) values
 ('18000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000003','staff'),
 ('18000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000004','staff');
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$
begin
 if ok is distinct from true then raise exception 'FAIL: %',label; end if;
 raise notice 'PASS: %',label;
end $$;
create function pg_temp.expect_error(expected text,statement text) returns void language plpgsql as $$
begin
 begin execute statement; exception when others then
  if sqlerrm=expected or sqlstate=expected then raise notice 'PASS: expected %',expected; return; end if;
  raise;
 end;
 raise exception 'FAIL: expected % for %',expected,statement;
end $$;
select pg_temp.check_true(not exists(select 1 from public.memberships where user_id in
 ('98000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002')),'owners have no school memberships');
select pg_temp.check_true(
 not has_function_privilege('anon','public.photo_begin(uuid,text,uuid,uuid)','execute') and
 not has_function_privilege('authenticated','public.photo_begin(uuid,text,uuid,uuid)','execute') and
 has_function_privilege('service_role','public.photo_begin(uuid,text,uuid,uuid)','execute') and
 not has_function_privilege('anon','public.photo_finish(uuid,text,uuid,uuid,text,integer)','execute') and
 not has_function_privilege('authenticated','public.photo_finish(uuid,text,uuid,uuid,text,integer)','execute') and
 has_function_privilege('service_role','public.photo_finish(uuid,text,uuid,uuid,text,integer)','execute'),
 'begin and finish remain executable only by the trusted processor');
do $$
declare
 owners uuid[]:=array['98000000-0000-4000-8000-000000000001'::uuid,'98000000-0000-4000-8000-000000000002'::uuid];
 school_slugs text[]:=array['photo-owner-public','photo-owner-hidden'];
 school_ids uuid[]:=array['18000000-0000-4000-8000-000000000001'::uuid,'18000000-0000-4000-8000-000000000002'::uuid];
 staff uuid:='98000000-0000-4000-8000-000000000003';
 foreign_staff uuid:='98000000-0000-4000-8000-000000000004';
 claimant uuid:='98000000-0000-4000-8000-000000000005';
 items uuid[]:=array[]::uuid[]; photos uuid[]:=array[]::uuid[];
 idx integer; remaining integer; reserved uuid; extra uuid; path text; result jsonb;
 payload jsonb:=jsonb_build_object('title','Fictional owner photo pencil','publicDescription','A fictional pink pencil for owner photo checks.',
  'category','other','color','pink','publicLocation','Library','foundDate',current_date::text,
  'identifyingDetails','Private fictional green mark','storageLocation','Private fictional cabinet');
begin
 -- Both owners create items using their ordinary authenticated identity.
 for idx in 1..2 loop
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub',owners[idx]::text,true);
  items[idx]:=(public.backend_dispatch('create_item',school_slugs[idx],null,payload)->'data'->>'id')::uuid;
  photos[idx]:=gen_random_uuid();
 end loop;
 -- Even a genuine owner cannot call the privileged RPC or forge another actor.
 perform pg_temp.expect_error('42501',format('select public.photo_begin(%L,%L,%L,%L)',owners[1],school_slugs[1],items[1],photos[1]));
 perform pg_temp.expect_error('42501',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',owners[1],school_slugs[1],items[1],photos[1],repeat('a',64)));
 perform set_config('request.jwt.claim.sub',claimant::text,true);
 perform set_config('request.jwt.claim.role','service_role',true);
 perform pg_temp.expect_error('42501',format('select public.photo_begin(%L,%L,%L,%L)',owners[1],school_slugs[1],items[1],photos[1]));
 perform set_config('role','service_role',true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform pg_temp.expect_error('FORBIDDEN',format('select public.photo_begin(%L,%L,%L,%L)',owners[1],school_slugs[1],items[1],photos[1]));
 perform pg_temp.expect_error('FORBIDDEN',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',owners[1],school_slugs[1],items[1],photos[1],repeat('a',64)));
 perform set_config('request.jwt.claim.role','service_role',true);
 perform set_config('request.jwt.claim.sub','',true);
 perform pg_temp.check_true(auth.uid() is null,'processor has no uploader auth.uid');
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_begin(%L,%L,%L,%L)',claimant,school_slugs[1],items[1],gen_random_uuid()));
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_begin(%L,%L,%L,%L)',foreign_staff,school_slugs[1],items[1],gen_random_uuid()));
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_begin(%L,%L,%L,%L)',owners[1],school_slugs[1],items[2],gen_random_uuid()));
 -- Ordinary staff still use their own school, without gaining another school.
 reserved:=gen_random_uuid();
 perform public.photo_begin(staff,school_slugs[1],items[1],reserved);
 perform public.photo_abort(staff,school_slugs[1],items[1],reserved);
 for idx in 1..2 loop
  perform set_config('role','service_role',true);
  perform set_config('request.jwt.claim.role','service_role',true);
  perform set_config('request.jwt.claim.sub','',true);
  result:=public.photo_begin(owners[idx],school_slugs[idx],items[idx],photos[idx]);
  path:=result->'data'->>'storagePath';
  perform pg_temp.check_true(path=school_ids[idx]::text||'/'||items[idx]::text||'/'||photos[idx]::text||'.webp','owner receives a scoped server-generated path');
  perform pg_temp.check_true(public.photo_begin(owners[idx],school_slugs[idx],items[idx],photos[idx])=result,'owner reservation retry remains idempotent');
  perform pg_temp.expect_error('CONFLICT',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',owners[idx],school_slugs[idx],items[idx],photos[idx],repeat('a',64)));
  insert into storage.objects(bucket_id,name,metadata) values('item-public',path,'{"mimetype":"image/webp","size":123}');
  perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',owners[3-idx],school_slugs[idx],items[idx],photos[idx],repeat('a',64)));
  perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',claimant,school_slugs[idx],items[idx],photos[idx],repeat('a',64)));
  perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',owners[idx],school_slugs[3-idx],items[idx],photos[idx],repeat('a',64)));
  result:=public.photo_finish(owners[idx],school_slugs[idx],items[idx],photos[idx],repeat('a',64),123);
  perform pg_temp.check_true(result->'data'->>'status'='pending','membership-free owner can finish a private photo');
  perform pg_temp.check_true(public.photo_finish(owners[idx],school_slugs[idx],items[idx],photos[idx],repeat('a',64),123)=result,'owner finalization retry remains idempotent');
  perform set_config('role','anon',true);
  perform set_config('request.jwt.claim.role','anon',true);
  perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_metadata(%L,%L,%L,false)',school_slugs[idx],items[idx],photos[idx]));
  perform pg_temp.check_true((select count(*)=0 from storage.objects where name=path),'pending owner photo is not public');
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub',claimant::text,true);
  perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_metadata(%L,%L,%L,true)',school_slugs[idx],items[idx],photos[idx]));
  perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_publish(%L,%L,%L,true)',school_slugs[idx],items[idx],photos[idx]));
  perform set_config('request.jwt.claim.sub',case when idx=1 then foreign_staff else staff end::text,true);
  perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_metadata(%L,%L,%L,true)',school_slugs[idx],items[idx],photos[idx]));
  perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_publish(%L,%L,%L,true)',school_slugs[idx],items[idx],photos[idx]));
  perform set_config('request.jwt.claim.sub',owners[idx]::text,true);
  perform pg_temp.check_true(jsonb_array_length(public.photo_list(school_slugs[idx],items[idx])->'data')=1,'owner can list processed private photo');
  perform pg_temp.check_true(public.photo_metadata(school_slugs[idx],items[idx],photos[idx],true)->'data'->>'status'='pending','owner can preview processed photo');
  perform pg_temp.check_true((select count(*)=1 from storage.objects where name=path),'owner can read private Storage derivative');
  perform pg_temp.expect_error('VALIDATION_ERROR',format('select public.photo_publish(%L,%L,%L,false)',school_slugs[idx],items[idx],photos[idx]));
  perform pg_temp.check_true(public.photo_publish(school_slugs[idx],items[idx],photos[idx],true)->'data'->>'status'='published','owner can explicitly publish reviewed photo');
  perform set_config('role','anon',true);
  perform set_config('request.jwt.claim.role','anon',true);
  perform set_config('request.jwt.claim.sub','',true);
  if idx=1 then
   perform pg_temp.check_true(public.photo_metadata(school_slugs[idx],items[idx],photos[idx],false)->'data'->>'status'='published','reviewed photo is public in a published school');
  else
   perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_metadata(%L,%L,%L,false)',school_slugs[idx],items[idx],photos[idx]));
  end if;
 end loop;
 -- Current owner status is rechecked at finish, not just at reservation.
 perform set_config('role','service_role',true);
 perform set_config('request.jwt.claim.role','service_role',true);
 reserved:=gen_random_uuid();
 result:=public.photo_begin(owners[2],school_slugs[2],items[2],reserved);
 path:=result->'data'->>'storagePath';
 insert into storage.objects(bucket_id,name,metadata) values('item-public',path,'{"mimetype":"image/webp","size":123}');
 perform set_config('role','postgres',true);
 delete from public.platform_admins where user_id=owners[2];
 perform set_config('role','service_role',true);
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',owners[2],school_slugs[2],items[2],reserved,repeat('a',64)));
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_begin(%L,%L,%L,%L)',owners[2],school_slugs[2],items[2],gen_random_uuid()));
 perform public.photo_abort(owners[2],school_slugs[2],items[2],reserved);
 perform pg_temp.check_true(not exists(select 1 from public.item_photos where id=reserved),'trusted abort still removes a revoked owner processing reservation');
 perform set_config('role','authenticated',true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claim.sub',owners[2]::text,true);
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_list(%L,%L)',school_slugs[2],items[2]));
 perform pg_temp.check_true((select count(*)=0 from storage.objects where name=path),'revoked owner loses private Storage access');
 -- Owner authorization must not bypass existing caps or actor-wide quota.
 perform set_config('role','service_role',true);
 perform set_config('request.jwt.claim.role','service_role',true);
 perform set_config('request.jwt.claim.sub','',true);
 reserved:=gen_random_uuid(); extra:=gen_random_uuid();
 perform public.photo_begin(owners[1],school_slugs[1],items[1],reserved);
 perform public.photo_begin(owners[1],school_slugs[1],items[1],extra);
 perform pg_temp.expect_error('CONFLICT',format('select public.photo_begin(%L,%L,%L,%L)',owners[1],school_slugs[1],items[1],gen_random_uuid()));
 perform public.photo_abort(owners[1],school_slugs[1],items[1],reserved);
 perform public.photo_abort(owners[1],school_slugs[1],items[1],extra);
 select 20-count(*) into remaining from public.audit_events where actor_id=owners[1] and action='photo_upload_reserved' and occurred_at>=now()-interval '1 hour';
 for idx in 1..remaining loop
  reserved:=gen_random_uuid();
  perform public.photo_begin(owners[1],school_slugs[1],items[1],reserved);
  perform public.photo_abort(owners[1],school_slugs[1],items[1],reserved);
 end loop;
 perform pg_temp.expect_error('RATE_LIMITED',format('select public.photo_begin(%L,%L,%L,%L)',owners[1],school_slugs[1],items[1],gen_random_uuid()));
end $$;
reset role;
select pg_temp.check_true(not exists(select 1 from public.memberships where user_id in
 ('98000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002')),'photo workflow never creates artificial owner memberships');
rollback;
