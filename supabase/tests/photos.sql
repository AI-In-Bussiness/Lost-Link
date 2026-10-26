\set ON_ERROR_STOP on
begin;
-- New synthetic fixtures; all rollback. No real user data or credentials.
insert into auth.users(id) values('33000000-0000-4000-8000-000000000001'),('33000000-0000-4000-8000-000000000002'),('33000000-0000-4000-8000-000000000003');
insert into public.memberships(organization_id,user_id,role) values
 ('10000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001','staff'),
 ('10000000-0000-4000-8000-000000000002','33000000-0000-4000-8000-000000000002','staff'),
 ('10000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000003','admin');
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
create function pg_temp.expect_error(expected text,statement text) returns void language plpgsql as $$
begin
 begin execute statement; exception when others then
  if sqlerrm=expected or sqlstate=expected then raise notice 'PASS: expected %',expected; return; end if; raise;
 end;
 raise exception 'FAIL: expected % for %',expected,statement;
end $$;
do $$
declare
 actor uuid:='33000000-0000-4000-8000-000000000001'; other_actor uuid:='33000000-0000-4000-8000-000000000002'; quota_actor uuid:='33000000-0000-4000-8000-000000000003';
 item uuid; photo uuid:=gen_random_uuid(); second uuid:=gen_random_uuid(); third uuid:=gen_random_uuid(); fourth uuid:=gen_random_uuid(); q uuid; j jsonb; path text; n bigint; idx integer;
 payload jsonb:=jsonb_build_object('title','Photo safety fictional backpack','publicDescription','A fictional bag for photo security tests.','category','bag','color','black','publicLocation','Gym','foundDate',current_date::text,'identifyingDetails','Hidden synthetic keyring','storageLocation','Private cabinet');
begin
 perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.role','authenticated',true); perform set_config('request.jwt.claim.sub',actor::text,true);
 item:=(public.backend_dispatch('create_item','maple-school',null,payload)->'data'->>'id')::uuid;
 perform pg_temp.expect_error('42501',format('select public.photo_begin(%L,%L,%L,%L)',actor,'maple-school',item,photo));
 perform pg_temp.expect_error('42501',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',actor,'maple-school',item,photo,repeat('a',64)));
 perform pg_temp.expect_error('42501',format('insert into storage.objects(bucket_id,name) values(%L,%L)','item-public','spoof.webp'));
 perform pg_temp.expect_error('42501',format('insert into storage.objects(bucket_id,name) values(%L,%L)','item-staging','spoof.webp'));
 perform set_config('role','service_role',true); perform set_config('request.jwt.claim.role','service_role',true); perform set_config('request.jwt.claim.sub','',true);
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_begin(%L,%L,%L,%L)',other_actor,'maple-school',item,photo));
 j:=public.photo_begin(actor,'maple-school',item,photo); path:=j->'data'->>'storagePath';
 perform pg_temp.check_true(path='10000000-0000-4000-8000-000000000001/'||item::text||'/'||photo::text||'.webp','server-generated immutable path');
 perform pg_temp.check_true(public.photo_begin(actor,'maple-school',item,photo)=j,'reservation retry is idempotent');
 perform pg_temp.expect_error('CONFLICT',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',actor,'maple-school',item,photo,repeat('a',64)));
 perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.role','authenticated',true); perform set_config('request.jwt.claim.sub',actor::text,true);
 perform pg_temp.expect_error('CONFLICT',format('select public.photo_publish(%L,%L,%L,true)','maple-school',item,photo));
 perform pg_temp.check_true(jsonb_array_length(public.photo_list('maple-school',item)->'data')=0,'processing reservations hidden from preview list');
 perform set_config('role','service_role',true); perform set_config('request.jwt.claim.role','service_role',true); perform set_config('request.jwt.claim.sub','',true);
 insert into storage.objects(bucket_id,name,metadata) values('item-public',path,'{"mimetype":"image/webp","size":123}');
 perform pg_temp.expect_error('VALIDATION_ERROR',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',actor,'maple-school',item,photo,'invalid-hash'));
 perform pg_temp.expect_error('CONFLICT',format('select public.photo_finish(%L,%L,%L,%L,%L,124)',actor,'maple-school',item,photo,repeat('a',64)));
 perform pg_temp.expect_error('VALIDATION_ERROR',format('select public.photo_finish(%L,%L,%L,%L,%L,4194305)',actor,'maple-school',item,photo,repeat('a',64)));
 perform public.photo_finish(actor,'maple-school',item,photo,repeat('a',64),123);
 perform public.photo_finish(actor,'maple-school',item,photo,repeat('a',64),123);
 perform pg_temp.expect_error('CONFLICT',format('select public.photo_abort(%L,%L,%L,%L)',actor,'maple-school',item,photo));
 perform set_config('role','anon',true); perform set_config('request.jwt.claim.role','anon',true);
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_metadata(%L,%L,%L,false)','maple-school',item,photo));
 perform pg_temp.check_true((select count(*)=0 from storage.objects where name=path),'anonymous cannot read pending derivative');
 perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.role','authenticated',true); perform set_config('request.jwt.claim.sub',other_actor::text,true);
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_metadata(%L,%L,%L,true)','maple-school',item,photo));
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_publish(%L,%L,%L,true)','maple-school',item,photo));
 perform pg_temp.check_true((select count(*)=0 from storage.objects where name=path),'other organization staff cannot read pending derivative');
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform pg_temp.check_true((select count(*)=1 from storage.objects where name=path),'own staff can preview sanitized pending derivative');
 j:=public.photo_metadata('maple-school',item,photo,true);
 perform pg_temp.check_true(j->'data'->>'sha256'=repeat('a',64) and j->'data'->>'contentType'='image/webp','preview contains verified content metadata');
 perform pg_temp.expect_error('VALIDATION_ERROR',format('select public.photo_publish(%L,%L,%L,false)','maple-school',item,photo));
 select count(*) into n from public.audit_events where entity_id=photo;
 perform public.photo_publish('maple-school',item,photo,true);
 perform public.photo_publish('maple-school',item,photo,true);
 perform pg_temp.check_true((select count(*)=n+1 from public.audit_events where entity_id=photo),'publication retry adds no duplicate audit');
 perform set_config('role','anon',true); perform set_config('request.jwt.claim.role','anon',true); perform set_config('request.jwt.claim.sub','',true);
 j:=public.photo_metadata('maple-school',item,photo,false);
 perform pg_temp.check_true(j->'data'->>'alt'='Photo safety fictional backpack','public alt derives solely from safe item title');
 perform pg_temp.check_true((select count(*)=1 from storage.objects where name=path),'approved public derivative readable');
 j:=public.backend_dispatch('item','maple-school',item);
 perform pg_temp.check_true(j->'data'->'photos'->0->>'url'='/api/v1/organizations/maple-school/items/'||item::text||'/photos/'||photo::text||'/content','item DTO exposes safe mediated content URL');
 perform pg_temp.check_true(not(j->'data'->'photos'->0?'storagePath'),'item DTO does not expose storage metadata');
 -- Three-photo cap includes unfinished reservations. Aborting preserves quota history.
 perform set_config('role','service_role',true); perform set_config('request.jwt.claim.role','service_role',true);
 perform public.photo_begin(actor,'maple-school',item,second); perform public.photo_begin(actor,'maple-school',item,third);
 perform pg_temp.expect_error('CONFLICT',format('select public.photo_begin(%L,%L,%L,%L)',actor,'maple-school',item,fourth));
 perform public.photo_abort(actor,'maple-school',item,third); perform public.photo_abort(actor,'maple-school',item,third);
 perform public.photo_begin(actor,'maple-school',item,fourth); perform public.photo_abort(actor,'maple-school',item,fourth);
 -- Service role grant alone insufficient if auth.role does not match trusted processor.
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform pg_temp.expect_error('FORBIDDEN',format('select public.photo_begin(%L,%L,%L,%L)',actor,'maple-school',item,fourth));
 perform set_config('request.jwt.claim.role','service_role',true);
 -- Independent caller quota counts aborted reservations, not only published uploads.
 for idx in 1..20 loop q:=gen_random_uuid(); perform public.photo_begin(quota_actor,'maple-school',item,q); perform public.photo_abort(quota_actor,'maple-school',item,q); end loop;
 perform pg_temp.expect_error('RATE_LIMITED',format('select public.photo_begin(%L,%L,%L,%L)',quota_actor,'maple-school',item,gen_random_uuid()));
 -- Null/partial legacy integrity metadata cannot be published (SQL NULL regression).
 perform set_config('role','postgres',true);
 update public.item_photos set status='pending',sha256=repeat('a',64),byte_size=123,processed_at=now(),content_type=null where id=second;
 perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.role','authenticated',true); perform set_config('request.jwt.claim.sub',actor::text,true);
 perform pg_temp.expect_error('CONFLICT',format('select public.photo_publish(%L,%L,%L,true)','maple-school',item,second));
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_metadata(%L,%L,%L,true)','maple-school',item,second));
 perform set_config('role','postgres',true);
 update public.items set status='returned' where id=item;
 perform set_config('role','anon',true); perform set_config('request.jwt.claim.role','anon',true); perform set_config('request.jwt.claim.sub','',true);
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_metadata(%L,%L,%L,false)','maple-school',item,photo));
 perform pg_temp.check_true((select count(*)=0 from storage.objects where name=path),'returned item revokes direct public Storage read');
 perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.role','authenticated',true); perform set_config('request.jwt.claim.sub',actor::text,true);
 perform pg_temp.check_true((select count(*)=1 from storage.objects where name=path),'staff retains private returned-item preview');
 perform set_config('role','service_role',true); perform set_config('request.jwt.claim.role','service_role',true);
 perform pg_temp.expect_error('CONFLICT',format('select public.photo_begin(%L,%L,%L,%L)',actor,'maple-school',item,gen_random_uuid()));
 perform set_config('role','postgres',true);
 update public.items set status='available' where id=item;
 update public.organizations set published=false where slug='maple-school';
 perform set_config('role','anon',true); perform set_config('request.jwt.claim.role','anon',true); perform set_config('request.jwt.claim.sub','',true);
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_metadata(%L,%L,%L,false)','maple-school',item,photo));
 perform pg_temp.check_true((select count(*)=0 from storage.objects where name=path),'unpublished organization revokes direct public Storage read');
 perform set_config('role','postgres',true);
 delete from public.memberships where user_id=actor;
 perform set_config('role','authenticated',true); perform set_config('request.jwt.claim.role','authenticated',true); perform set_config('request.jwt.claim.sub',actor::text,true);
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_list(%L,%L)','maple-school',item));
 perform pg_temp.check_true((select count(*)=0 from storage.objects where name=path),'membership revocation removes private preview access');
 perform set_config('role','service_role',true); perform set_config('request.jwt.claim.role','service_role',true);
 perform pg_temp.expect_error('NOT_FOUND',format('select public.photo_finish(%L,%L,%L,%L,%L,123)',actor,'maple-school',item,second,repeat('a',64)));
end $$;
reset role;
rollback;
