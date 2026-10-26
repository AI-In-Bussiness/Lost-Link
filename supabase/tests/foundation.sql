\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
insert into auth.users(id) values
 ('30000000-0000-4000-8000-000000000001'),('30000000-0000-4000-8000-000000000002'),('30000000-0000-4000-8000-000000000003'),('30000000-0000-4000-8000-000000000004'),('30000000-0000-4000-8000-000000000005');
insert into public.memberships(organization_id,user_id,role) values
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','staff'),
 ('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','staff'),
 ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000005','admin');
insert into public.claims(id,organization_id,item_id,claimant_id,evidence_text,private_review_note) values
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','There is a yellow dinosaur keyring inside.','Internal staff note');
insert into public.item_photos(organization_id,item_id,storage_path,status) values
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/approved.webp','published'),
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/pending.webp','pending');
insert into storage.objects(bucket_id,name) values
 ('item-public','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/approved.webp'),
 ('item-staging','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/pending.webp');
set local role anon;
select pg_temp.assert_true((select count(*)=1 from public.list_public_items('maple-school')), 'anonymous org-scoped listing');
select pg_temp.assert_true((select count(*)=0 from public.list_public_items('missing')), 'unknown organization empty');
select pg_temp.assert_true((select not (to_jsonb(x) ? 'created_by') and not (to_jsonb(x) ? 'identifying_details') and jsonb_array_length(photos)=1 from public.list_public_items('maple-school') x),'public projection excludes private fields and pending photo');
select pg_temp.assert_true((select count(*)=1 from storage.objects),'anonymous sees only approved derivative');
do $$ begin perform * from public.items; raise exception 'FAIL anonymous direct items'; exception when insufficient_privilege then raise notice 'PASS anonymous direct items denied'; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((select count(*)=1 from public.items),'staff reads own org only');
select pg_temp.assert_true((select count(*)=0 from public.item_private_details where organization_id='10000000-0000-4000-8000-000000000002'),'other org private facts hidden');
select pg_temp.assert_true((select count(*)=1 from public.claims),'same org staff reads evidence');
do $$ begin update public.claims set status='approved'; raise exception 'FAIL direct claim transition'; exception when insufficient_privilege then raise notice 'PASS direct claim mutation denied'; end $$;
do $$ begin insert into public.memberships values('10000000-0000-4000-8000-000000000002',auth.uid(),'admin',now()); raise exception 'FAIL membership escalation'; exception when insufficient_privilege then raise notice 'PASS membership escalation denied'; end $$;
do $$ begin insert into storage.objects(bucket_id,name) values('item-staging','10000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000002/attack.webp'); raise exception 'FAIL cross org upload'; exception when insufficient_privilege then raise notice 'PASS cross org staging upload denied'; end $$;
do $$ begin insert into storage.objects(bucket_id,name) values('item-public','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/unreviewed.webp'); raise exception 'FAIL public derivative upload'; exception when insufficient_privilege then raise notice 'PASS direct derivative publication denied'; end $$;
insert into storage.objects(bucket_id,name) values('item-staging','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/new.webp');
select pg_temp.assert_true((select count(*)=3 from storage.objects),'staff staging upload succeeds');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.claims),'other org staff cannot read claims');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true((select count(*)=0 from public.claims),'claimant cannot read raw staff notes');
select pg_temp.assert_true((select count(*)=1 from public.list_own_claims()),'claimant safe own claim read');
select pg_temp.assert_true((select not(to_jsonb(x)?'private_review_note') from public.list_own_claims() x),'owner RPC excludes staff notes');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000004',true);
select pg_temp.assert_true((select count(*)=0 from public.list_own_claims()),'other claimant cannot read proof');
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000005',true);
select pg_temp.assert_true((select count(*)=1 from public.items),'admin remains tenant scoped');
reset role;
delete from public.memberships where user_id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((select count(*)=0 from public.items),'membership removal immediately revokes staff reads');
reset role;
do $$ begin insert into public.item_private_details(item_id,organization_id) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'); raise exception 'FAIL composite FK'; exception when foreign_key_violation or unique_violation then
 -- Use claim instead to avoid existing private-details primary key masking FK.
 begin insert into public.claims(organization_id,item_id,claimant_id,evidence_text) values('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000004','An adequately long synthetic proof.'); raise exception 'FAIL claim composite FK'; exception when foreign_key_violation then raise notice 'PASS cross-org composite FK'; end;
end $$;
do $$ begin insert into public.claims(organization_id,item_id,claimant_id,evidence_text) values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','Another adequately long synthetic proof.'); raise exception 'FAIL duplicate active claim'; exception when unique_violation then raise notice 'PASS duplicate active claim constraint'; end $$;
insert into public.claims(organization_id,item_id,claimant_id,evidence_text,status) values('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','An adequately long synthetic proof.','approved');
do $$ begin insert into public.claims(organization_id,item_id,claimant_id,evidence_text,status) values('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000004','Another adequately long synthetic proof.','approved'); raise exception 'FAIL two approved claims'; exception when unique_violation then raise notice 'PASS one approved claim constraint'; end $$;
do $$ begin update public.items set found_date=current_date+1 where id='20000000-0000-4000-8000-000000000001'; raise exception 'FAIL future found date'; exception when check_violation then raise notice 'PASS future found date rejected'; end $$;
update public.items set status='returned' where id='20000000-0000-4000-8000-000000000001';
set local role anon;
select pg_temp.assert_true((select count(*)=0 from public.list_public_items('maple-school')),'returned item absent');
select pg_temp.assert_true((select count(*)=0 from storage.objects),'returned item derivative access revoked');
reset role;
update public.organizations set published=false where slug='cedar-school';
set local role anon;
select pg_temp.assert_true((select count(*)=0 from public.list_public_items('cedar-school')),'unpublished org invisible');
reset role;
rollback;
