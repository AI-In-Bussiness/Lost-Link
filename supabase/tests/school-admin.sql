\set ON_ERROR_STOP on
begin;
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;raise notice 'PASS: %',label;end $$;
create function pg_temp.school_denied(action text,school text,payload jsonb,expected text) returns void language plpgsql as $$ begin perform public.school_admin_dispatch(action,school,payload);raise exception 'FAIL: school action accepted';exception when raise_exception then if sqlerrm<>expected then raise;end if;raise notice 'PASS school denial: %',expected;end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('89000000-0000-4000-8000-000000000001','scoped-admin@example.test',now()),
 ('89000000-0000-4000-8000-000000000002','scoped-staff@example.test',now()),
 ('89000000-0000-4000-8000-000000000003','scoped-owner@example.test',now());
insert into public.organizations(id,slug,name,published) values
 ('19000000-0000-4000-8000-000000000001','scoped-one','School One',false),
 ('19000000-0000-4000-8000-000000000002','scoped-two','School Two',false);
insert into public.memberships(organization_id,user_id,role) values('19000000-0000-4000-8000-000000000001','89000000-0000-4000-8000-000000000001','admin');
insert into public.platform_admins(user_id) values('89000000-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claim.sub','89000000-0000-4000-8000-000000000001',true);
select pg_temp.check_true(jsonb_array_length(public.school_admin_dispatch('overview','scoped-one')->'schools')=1 and jsonb_array_length(public.school_admin_dispatch('overview','scoped-one')->'owners')=0,'school overview contains only its own school and no owner directory');
select pg_temp.school_denied('overview','scoped-two','{}','NOT_FOUND');
select pg_temp.school_denied('create_school','scoped-one','{}','VALIDATION_ERROR');
select pg_temp.school_denied('set_member','scoped-one','{"schoolId":"19000000-0000-4000-8000-000000000002","expectedVersion":1,"email":"scoped-staff@example.test","role":"admin"}','NOT_FOUND');
select public.school_admin_dispatch('update_school','scoped-one','{"schoolId":"19000000-0000-4000-8000-000000000001","expectedVersion":1,"name":"Own school renamed","timezone":"UTC","contactEmail":"office@example.test","collectionInstructions":"Office after 3pm","published":true}');
select pg_temp.school_denied('remove_member','scoped-one','{"schoolId":"19000000-0000-4000-8000-000000000001","expectedVersion":2,"userId":"89000000-0000-4000-8000-000000000001"}','LAST_SCHOOL_ADMIN');
select pg_temp.school_denied('set_member','scoped-one','{"schoolId":"19000000-0000-4000-8000-000000000001","expectedVersion":2,"email":"scoped-admin@example.test","role":"staff"}','LAST_SCHOOL_ADMIN');
select pg_temp.school_denied('set_member','scoped-one','{"schoolId":"19000000-0000-4000-8000-000000000001","expectedVersion":2,"email":"scoped-staff@example.test","role":"owner"}','VALIDATION_ERROR');
select public.school_admin_dispatch('set_member','scoped-one','{"schoolId":"19000000-0000-4000-8000-000000000001","expectedVersion":2,"email":"scoped-staff@example.test","role":"admin"}');
select public.school_admin_dispatch('remove_member','scoped-one','{"schoolId":"19000000-0000-4000-8000-000000000001","expectedVersion":3,"userId":"89000000-0000-4000-8000-000000000001"}');
select pg_temp.school_denied('overview','scoped-one','{}','NOT_FOUND');
select set_config('request.jwt.claim.sub','89000000-0000-4000-8000-000000000003',true);
select pg_temp.check_true(private.is_staff('19000000-0000-4000-8000-000000000001') and private.is_staff('19000000-0000-4000-8000-000000000002'),'website owner has every school workspace without individual memberships');
select pg_temp.check_true(jsonb_array_length(public.platform_admin_dispatch('overview')->'schools')>=2,'website owner can administer all schools');
select pg_temp.check_true((public.school_admin_dispatch('overview','scoped-two')->'schools'->0->>'id')='19000000-0000-4000-8000-000000000002','owner can also use any scoped school settings');
select public.platform_admin_dispatch('set_member','{"schoolId":"19000000-0000-4000-8000-000000000002","expectedVersion":1,"email":"scoped-admin@example.test","role":"admin"}');
select set_config('request.jwt.claim.sub','89000000-0000-4000-8000-000000000001',true);
select pg_temp.check_true((public.school_admin_dispatch('overview','scoped-two')->'schools'->0->>'id')='19000000-0000-4000-8000-000000000002','owner-assigned school admin can use only the assigned school');
select pg_temp.school_denied('overview','scoped-one','{}','NOT_FOUND');
reset role;
select pg_temp.check_true((select count(*)=3 from public.platform_admin_events where organization_id='19000000-0000-4000-8000-000000000001'),'school-scoped settings and access changes are audited');
rollback;
