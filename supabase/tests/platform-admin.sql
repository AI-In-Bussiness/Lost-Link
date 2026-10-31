\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
create function pg_temp.denied(action text,payload jsonb,expected text) returns void language plpgsql as $$
begin
 perform public.platform_admin_dispatch(action,payload);
 raise exception 'FAIL: command was not rejected';
exception when raise_exception then
 if sqlerrm<>expected then raise; end if;
 raise notice 'PASS: rejected command (%)',expected;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('39000000-0000-4000-8000-000000000001','owner-one@example.test',now()),
 ('39000000-0000-4000-8000-000000000002','owner-two@example.test',now()),
 ('39000000-0000-4000-8000-000000000003','school-staff@example.test',now()),
 ('39000000-0000-4000-8000-000000000004','claimant-owner-test@example.test',now()),
 ('39000000-0000-4000-8000-000000000005','unconfirmed-owner-test@example.test',null);
select pg_temp.assert_true(public.bootstrap_platform_admins(array['owner-one@example.test','owner-two@example.test'])=2,'secure operator bootstraps both confirmed accounts');
select pg_temp.assert_true(public.bootstrap_platform_admins(array['owner-two@example.test','owner-one@example.test'])=2,'bootstrap is idempotent with same pair');
do $$ begin perform public.bootstrap_platform_admins(array['school-staff@example.test','owner-two@example.test']);raise exception 'FAIL bootstrap replacement';exception when raise_exception then if sqlerrm<>'OWNERS_ALREADY_CONFIGURED' then raise;end if;raise notice 'PASS owner replacement denied';end $$;
do $$ begin perform public.bootstrap_platform_admins(array['unconfirmed-owner-test@example.test','owner-two@example.test']);raise exception 'FAIL unconfirmed owner';exception when raise_exception then if sqlerrm<>'BOTH_ACCOUNTS_MUST_EXIST_AND_BE_CONFIRMED' then raise;end if;raise notice 'PASS unconfirmed owner denied';end $$;
set local role anon;
do $$ begin perform public.platform_admin_dispatch('overview');raise exception 'FAIL anonymous admin';exception when insufficient_privilege then raise notice 'PASS anonymous admin RPC denied';end $$;
do $$ begin perform public.bootstrap_platform_admins(array['owner-one@example.test','owner-two@example.test']);raise exception 'FAIL anonymous bootstrap';exception when insufficient_privilege then raise notice 'PASS anonymous bootstrap denied';end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','39000000-0000-4000-8000-000000000004',true);
select pg_temp.denied('overview','{}','FORBIDDEN');
select pg_temp.assert_true((select count(*)=0 from public.platform_admins),'claimant cannot enumerate owner identities');
do $$ begin insert into public.platform_admins(user_id) values(auth.uid());raise exception 'FAIL owner self promotion';exception when insufficient_privilege then raise notice 'PASS owner self-promotion denied';end $$;
do $$ begin perform public.bootstrap_platform_admins(array['owner-one@example.test','owner-two@example.test']);raise exception 'FAIL authenticated bootstrap';exception when insufficient_privilege then raise notice 'PASS authenticated bootstrap denied';end $$;
select set_config('request.jwt.claim.sub','39000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((select count(*)=1 from public.platform_admins),'owner raw table exposes only own assignment');
select public.platform_admin_dispatch('create_school','{"name":"Owner test school","slug":"owner-test-school","timezone":"America/New_York","contactEmail":"office@example.test","collectionInstructions":"Office from 3pm","published":false}') as result \gset
select (:'result'::jsonb->>'schoolId') as school_id \gset
reset role;
insert into public.items(id,organization_id,title,public_description,category,color,public_location,found_date)
 values('29000000-0000-4000-8000-000000000001',:'school_id'::uuid,'Test bag','Fictional bag','bag','blue','Office',current_date-1);
insert into public.claims(id,organization_id,item_id,claimant_id,evidence_text,private_review_note)
 values('49000000-0000-4000-8000-000000000001',:'school_id'::uuid,'29000000-0000-4000-8000-000000000001','39000000-0000-4000-8000-000000000004','An owner-only identifying detail.','Private staff-only note');
select pg_temp.assert_true((private.backend_claim_json('49000000-0000-4000-8000-000000000001')->>'collectionInstructions')='Office from 3pm'
 and not(private.backend_claim_json('49000000-0000-4000-8000-000000000001') ? 'privateReviewNote'),'claim receipt inherits collection instructions without private notes');
set local role authenticated;
select pg_temp.assert_true(exists(select 1 from jsonb_array_elements(public.school_directory()->'data') s where s->>'slug'='owner-test-school' and s->>'publicListingEnabled'='false'),'owner sees hidden school without publishing it');
select pg_temp.assert_true(private.is_staff(:'school_id'::uuid),'website owner has full school access');
select pg_temp.denied('update_school',jsonb_build_object('schoolId',:'school_id','expectedVersion',1,'name','Renamed school','timezone','Invalid/Zone','contactEmail','','collectionInstructions','','published',true),'VALIDATION_ERROR');
select public.platform_admin_dispatch('update_school',jsonb_build_object('schoolId',:'school_id','expectedVersion',1,'name','Renamed school','timezone','UTC','contactEmail','office@example.test','collectionInstructions','Office from 3pm','published',true));
select pg_temp.assert_true(exists(select 1 from jsonb_array_elements(public.school_directory()->'data') s where s->>'slug'='owner-test-school' and s->>'contactEmail'='office@example.test'),'published school dynamically discoverable with safe public settings');
select pg_temp.denied('update_school',jsonb_build_object('schoolId',:'school_id','expectedVersion',1,'name','Stale overwrite','timezone','UTC','contactEmail','','collectionInstructions','','published',false),'CONFLICT');
select pg_temp.denied('set_member',jsonb_build_object('schoolId',:'school_id','expectedVersion',2,'email','school-staff@example.test','role','owner'),'VALIDATION_ERROR');
select pg_temp.denied('set_member',jsonb_build_object('schoolId',:'school_id','expectedVersion',2,'email','unconfirmed-owner-test@example.test','role','staff'),'ACCOUNT_NOT_READY');
select public.platform_admin_dispatch('set_member',jsonb_build_object('schoolId',:'school_id','expectedVersion',2,'email','school-staff@example.test','role','staff'));
reset role;
-- Existing school admins remain scoped staff, with no website-owner permissions.
update public.memberships set role='admin' where organization_id=:'school_id'::uuid and user_id='39000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','39000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true(private.is_staff(:'school_id'::uuid),'assigned school admin has scoped access');
select pg_temp.denied('overview','{}','FORBIDDEN');
select pg_temp.denied('create_school','{}','FORBIDDEN');
select pg_temp.denied('update_school','{}','FORBIDDEN');
select pg_temp.denied('set_member','{}','FORBIDDEN');
select pg_temp.denied('remove_member','{}','FORBIDDEN');
do $$ begin perform private.platform_admin_dispatch('overview','{}');raise exception 'FAIL private owner dispatch';exception when insufficient_privilege then raise notice 'PASS private owner implementation cannot bypass owner-only wrapper';end $$;
select pg_temp.assert_true((select count(*)=0 from public.platform_admin_events),'school admin cannot read owner audit');
select set_config('request.jwt.claim.sub','39000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true(jsonb_array_length(public.platform_admin_dispatch('overview')->'owners')=2,'second owner has same website controls');
select pg_temp.denied('set_member',jsonb_build_object('schoolId',:'school_id','expectedVersion',3,'email','school-staff@example.test','role','staff','injected',true),'VALIDATION_ERROR');
select public.platform_admin_dispatch('remove_member',jsonb_build_object('schoolId',:'school_id','expectedVersion',3,'userId','39000000-0000-4000-8000-000000000003'));
select pg_temp.assert_true((select count(*)=4 from public.platform_admin_events where organization_id=:'school_id'::uuid),'all successful mutations audited; failures do not create events');
do $$ begin delete from public.platform_admin_events;raise exception 'FAIL audit deletion';exception when insufficient_privilege then raise notice 'PASS owner cannot erase audit';end $$;
select set_config('request.jwt.claim.sub','39000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true(not private.is_staff(:'school_id'::uuid),'school membership removal immediately revokes access');
-- Owner one can delete a populated school, after explicit current confirmation.
select set_config('request.jwt.claim.sub','39000000-0000-4000-8000-000000000001',true);
select pg_temp.denied('delete_school',jsonb_build_object('schoolId',:'school_id','expectedVersion',3,'schoolSlug','owner-test-school','confirm','delete'),'CONFLICT');
select pg_temp.denied('delete_school',jsonb_build_object('schoolId',:'school_id','expectedVersion',4,'schoolSlug','wrong-school','confirm','delete'),'VALIDATION_ERROR');
select pg_temp.denied('delete_school',jsonb_build_object('schoolId',:'school_id','expectedVersion',4,'schoolSlug','owner-test-school','confirm','remove'),'VALIDATION_ERROR');
select pg_temp.denied('delete_school',jsonb_build_object('schoolId',:'school_id','expectedVersion',4,'schoolSlug','owner-test-school'),'VALIDATION_ERROR');
reset role;
insert into public.item_private_details(item_id,organization_id,identifying_details,storage_location) values('29000000-0000-4000-8000-000000000001',:'school_id'::uuid,'Private bag fact','Staff cupboard');
insert into public.item_photos(id,organization_id,item_id,storage_path,status) values('59000000-0000-4000-8000-000000000001',:'school_id'::uuid,'29000000-0000-4000-8000-000000000001',:'school_id'||'/29000000-0000-4000-8000-000000000001/59000000-0000-4000-8000-000000000001.webp','processing');
insert into public.audit_events(organization_id,action,entity_type,entity_id,request_id) values(:'school_id'::uuid,'fixture','item','29000000-0000-4000-8000-000000000001',gen_random_uuid());
select count(*) as other_schools from public.organizations where id<>:'school_id'::uuid \gset
set local role authenticated;
select set_config('request.jwt.claim.sub','39000000-0000-4000-8000-000000000003',true);
select pg_temp.denied('delete_school',jsonb_build_object('schoolId',:'school_id','expectedVersion',4,'schoolSlug','owner-test-school','confirm','delete'),'FORBIDDEN');
do $$ begin select * from public.school_photo_cleanup; raise exception 'FAIL cleanup read';exception when insufficient_privilege then raise notice 'PASS cleanup outbox protected';end $$;
select set_config('request.jwt.claim.sub','39000000-0000-4000-8000-000000000001',true);
select public.platform_admin_dispatch('delete_school',jsonb_build_object('schoolId',:'school_id','expectedVersion',4,'schoolSlug','owner-test-school','confirm','delete'));
select pg_temp.denied('delete_school',jsonb_build_object('schoolId',:'school_id','expectedVersion',4,'schoolSlug','owner-test-school','confirm','delete'),'NOT_FOUND');
select pg_temp.assert_true((public.platform_admin_dispatch('overview')->>'photoCleanupPending')::boolean,'owner can see cleanup remains pending');
reset role;
select pg_temp.assert_true(not exists(select 1 from public.organizations where id=:'school_id'::uuid),'school permanently removed');
select pg_temp.assert_true(not exists(select 1 from public.items where organization_id=:'school_id'::uuid),'school inventory removed');
select pg_temp.assert_true(not exists(select 1 from public.claims where organization_id=:'school_id'::uuid),'school claims removed');
select pg_temp.assert_true(not exists(select 1 from public.item_private_details where organization_id=:'school_id'::uuid),'school private facts removed');
select pg_temp.assert_true(not exists(select 1 from public.item_photos where organization_id=:'school_id'::uuid),'school photo metadata removed');
select pg_temp.assert_true(not exists(select 1 from public.audit_events where organization_id=:'school_id'::uuid),'school activity removed');
select pg_temp.assert_true(not exists(select 1 from public.memberships where organization_id=:'school_id'::uuid),'school memberships removed');
select pg_temp.assert_true(not exists(select 1 from public.platform_admin_events where organization_id=:'school_id'::uuid),'prior school administration records removed');
select pg_temp.assert_true(exists(select 1 from public.platform_admin_events where action='delete_school' and details->>'schoolId'=:'school_id' and organization_id is null),'minimal deletion receipt survives');
select pg_temp.assert_true(exists(select 1 from public.school_photo_cleanup where storage_path like :'school_id'||'/%'),'photo cleanup survives removal of metadata');
select pg_temp.assert_true((select count(*) from public.organizations)=:other_schools,'other schools retained');
select pg_temp.assert_true((select count(*)=5 from auth.users where id::text like '39000000-%'),'user accounts retained');
set local role authenticated;
select set_config('request.jwt.claim.sub','39000000-0000-4000-8000-000000000002',true);
select public.platform_admin_dispatch('create_school','{"name":"Second owner deletion","slug":"second-owner-deletion","timezone":"UTC","contactEmail":"","collectionInstructions":"","published":false}') as second_result \gset
select public.platform_admin_dispatch('delete_school',jsonb_build_object('schoolId',:'second_result'::jsonb->>'schoolId','expectedVersion',1,'schoolSlug','second-owner-deletion','confirm','delete'));
reset role;
delete from public.platform_admins where user_id='39000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','39000000-0000-4000-8000-000000000002',true);
select pg_temp.denied('overview','{}','FORBIDDEN');
reset role;
rollback;
