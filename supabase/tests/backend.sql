\set ON_ERROR_STOP on
begin;
-- All fixtures roll back; no account/password provisioning.
insert into auth.users(id) values ('31000000-0000-4000-8000-000000000001'),('31000000-0000-4000-8000-000000000002'),('31000000-0000-4000-8000-000000000003'),('31000000-0000-4000-8000-000000000004'),('31000000-0000-4000-8000-000000000005');
insert into public.memberships(organization_id,user_id,role) values
 ('10000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','staff'),
 ('10000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000002','staff'),
 ('10000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000005','admin');
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
create function pg_temp.expect_error(expected text,act text,org text default 'maple-school',target uuid default null,payload jsonb default '{}') returns void language plpgsql as $$
begin
 begin perform public.backend_dispatch(act,org,target,payload); exception when raise_exception then
  if sqlerrm=expected then raise notice 'PASS: % rejects with %',act,expected; return; end if; raise;
 end;
 raise exception 'FAIL: % expected %',act,expected;
end $$;
set local role authenticated;
do $$
declare
 staff uuid:='31000000-0000-4000-8000-000000000001'; foreign_staff uuid:='31000000-0000-4000-8000-000000000002';
 owner1 uuid:='31000000-0000-4000-8000-000000000003'; owner2 uuid:='31000000-0000-4000-8000-000000000004'; admin uuid:='31000000-0000-4000-8000-000000000005';
 item uuid; second_item uuid; claim1 uuid; claim2 uuid; self_claim uuid; c uuid; j jsonb; count_before bigint; cursor_text text;
 payload jsonb:=jsonb_build_object('title','Black demo backpack','publicDescription','A black sports backpack with white logo.','category','bag','color','black','publicLocation','Gym entrance','foundDate',current_date::text,'identifyingDetails','Synthetic secret hidden dinosaur keyring.','storageLocation','Private demo cabinet');
begin
 perform set_config('request.jwt.claim.sub','',true);
 perform pg_temp.check_true(public.backend_dispatch('organization','maple-school')->'data'->>'name'='Flint Hill School','public organization');
 perform pg_temp.check_true(public.backend_dispatch('organization','cedar-school')->'data'->>'name'='Fairfax High School','second public organization');
 perform pg_temp.check_true(jsonb_array_length(public.backend_dispatch('search','maple-school',null,'{"query":"zzzzzunrelated"}')->'data')=0,'no arbitrary matches');
 perform pg_temp.expect_error('UNAUTHORIZED','create_item');
 perform pg_temp.expect_error('VALIDATION_ERROR','search','maple-school',null,'{"query":"bag","limit":0}');
 perform pg_temp.expect_error('VALIDATION_ERROR','items','maple-school',null,'{"limit":"20"}');
 perform set_config('request.jwt.claim.sub',staff::text,true);
 j:=public.backend_dispatch('create_item','maple-school',null,payload); item:=(j->'data'->>'id')::uuid;
 perform pg_temp.check_true(j->'data'->>'status'='available' and j->'data'->>'identifyingDetails' like 'Synthetic secret%','staff creates inventory/private facts');
 second_item:=(public.backend_dispatch('create_item','maple-school',null,payload||'{"title":"Second item"}')->'data'->>'id')::uuid;
 perform pg_temp.expect_error('VALIDATION_ERROR','create_item','maple-school',null,payload||'{"createdBy":"spoof"}');
 perform pg_temp.expect_error('VALIDATION_ERROR','create_item','maple-school',null,payload||jsonb_build_object('foundDate',(current_date+1)::text));
 perform pg_temp.expect_error('VALIDATION_ERROR','create_item','maple-school',null,payload||'{"storageLocation":null}');
 perform pg_temp.expect_error('CONFLICT','update_item','maple-school',item,'{"expectedVersion":99,"title":"Wrong version"}');
 j:=public.backend_dispatch('update_item','maple-school',item,'{"expectedVersion":1,"title":"Updated black backpack"}');
 perform pg_temp.check_true((j->'data'->>'version')::int=2 and j->'data'->>'title'='Updated black backpack','versioned update');
 perform pg_temp.expect_error('VALIDATION_ERROR','update_item','maple-school',item,'{"expectedVersion":2,"status":"returned"}');
 perform set_config('request.jwt.claim.sub',owner1::text,true);
 j:=public.backend_dispatch('item','maple-school',item);
 perform pg_temp.check_true(not(j->'data'?'identifyingDetails') and not(j->'data'?'storageLocation') and not(j->'data'?'version'),'public item hides private properties');
 j:=public.backend_dispatch('items','maple-school',null,'{"limit":1}'); cursor_text:=j->'page'->>'nextCursor';
 perform pg_temp.check_true(cursor_text is not null and jsonb_array_length(j->'data')=1,'bounded listing next cursor');
 j:=public.backend_dispatch('items','maple-school',null,jsonb_build_object('limit',1,'cursor',cursor_text));
 perform pg_temp.check_true((j->'data'->0->>'id')::uuid>cursor_text::uuid,'listing seeks after UUID cursor');
 j:=public.backend_dispatch('search','maple-school',null,'{"query":"black backpack","category":"bag"}');
 perform pg_temp.check_true(jsonb_array_length(j->'data')>=1 and j->'data'->0->>'method'='structured','structured matching');
 claim1:=(public.backend_dispatch('submit_claim','maple-school',item,'{"evidenceText":"The hidden dinosaur keyring is yellow."}')->'data'->>'id')::uuid;
 perform pg_temp.expect_error('CONFLICT','submit_claim','maple-school',item,'{"evidenceText":"Another long enough private proof."}');
 perform pg_temp.expect_error('VALIDATION_ERROR','submit_claim','maple-school',item,'{"evidenceText":"short"}');
 perform pg_temp.expect_error('NOT_FOUND','review_claim','maple-school',claim1,'{"expectedVersion":1,"decision":"approve"}');
 perform set_config('request.jwt.claim.sub',owner2::text,true);
 perform pg_temp.check_true(jsonb_array_length(public.backend_dispatch('own_claims')->'data')=0,'other owner cannot read private proof');
 perform pg_temp.expect_error('NOT_FOUND','withdraw_claim','maple-school',claim1,'{"expectedVersion":1}');
 claim2:=(public.backend_dispatch('submit_claim','maple-school',item,'{"evidenceText":"Another claimant with a different private story."}')->'data'->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 self_claim:=(public.backend_dispatch('submit_claim','maple-school',item,'{"evidenceText":"A staff member also claims this synthetic item."}')->'data'->>'id')::uuid;
 perform pg_temp.expect_error('FORBIDDEN','review_claim','maple-school',self_claim,'{"expectedVersion":1,"decision":"approve"}');
 j:=public.backend_dispatch('review_claim','maple-school',claim1,'{"expectedVersion":1,"decision":"approve","privateNote":"Private staff observation"}');
 perform pg_temp.check_true(j->'data'->>'status'='approved','approval succeeds');
 perform pg_temp.check_true((select status='reserved' from public.items where id=item),'approval reserves item atomically');
 perform pg_temp.check_true((select status='rejected' and decision_reason='item_unavailable' and closed_at is not null from public.claims where id=claim2),'competing claim rejected atomically');
 select count(*) into count_before from public.audit_events;
 perform public.backend_dispatch('review_claim','maple-school',claim1,'{"expectedVersion":1,"decision":"approve"}');
 perform pg_temp.check_true((select count(*)=count_before from public.audit_events),'approval retry does not duplicate audit');
 perform pg_temp.expect_error('CONFLICT','review_claim','maple-school',claim2,'{"expectedVersion":2,"decision":"approve"}');
 perform set_config('request.jwt.claim.sub',foreign_staff::text,true);
 perform pg_temp.expect_error('NOT_FOUND','review_claim','maple-school',claim1,'{"expectedVersion":2,"decision":"approve"}');
 perform pg_temp.expect_error('NOT_FOUND','staff_item','maple-school',item);
 perform set_config('request.jwt.claim.sub',owner1::text,true);
 perform pg_temp.expect_error('NOT_FOUND','item','maple-school',item);
 j:=public.backend_dispatch('own_claims');
 perform pg_temp.check_true(not(j->'data'->0?'privateReviewNote') and j->'data'->0->>'evidenceText' is not null,'owner claim response hides private review note');
 perform pg_temp.expect_error('CONFLICT','withdraw_claim','maple-school',claim1,'{"expectedVersion":2}');
 perform set_config('request.jwt.claim.sub',staff::text,true);
 j:=public.backend_dispatch('cancel_claim','maple-school',claim1,'{"expectedVersion":2}');
 perform pg_temp.check_true(j->'data'->>'status'='cancelled' and (select status='available' from public.items where id=item),'cancel approval releases reservation');
 perform pg_temp.check_true((select status='rejected' from public.claims where id=claim2),'cancel does not resurrect competitors');
 perform set_config('request.jwt.claim.sub',owner2::text,true);
 c:=(public.backend_dispatch('submit_claim','maple-school',item,'{"evidenceText":"New explicit resubmission with private evidence."}')->'data'->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 perform public.backend_dispatch('review_claim','maple-school',c,'{"expectedVersion":1,"decision":"reject","claimantReason":"The supplied details do not match. Contact staff for help.","privateNote":"Another secret staff note"}');
 perform set_config('request.jwt.claim.sub',owner1::text,true);
 c:=(public.backend_dispatch('submit_claim','maple-school',item,'{"evidenceText":"Resubmitted evidence before withdrawing this claim."}')->'data'->>'id')::uuid;
 j:=public.backend_dispatch('withdraw_claim','maple-school',c,'{"expectedVersion":1}');
 perform pg_temp.check_true(j->'data'->>'status'='withdrawn','owner withdraws submitted claim');
 c:=(public.backend_dispatch('submit_claim','maple-school',item,'{"evidenceText":"Evidence for the final successful pickup."}')->'data'->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 perform public.backend_dispatch('review_claim','maple-school',c,'{"expectedVersion":1,"decision":"approve"}');
 perform pg_temp.expect_error('VALIDATION_ERROR','return_claim','maple-school',c,'{"expectedVersion":2,"ownershipVerified":false}');
 perform public.backend_dispatch('return_claim','maple-school',c,'{"expectedVersion":2,"ownershipVerified":true}');
 select count(*) into count_before from public.audit_events;
 perform public.backend_dispatch('return_claim','maple-school',c,'{"expectedVersion":2,"ownershipVerified":true}');
 perform pg_temp.check_true((select count(*)=count_before from public.audit_events),'return retry does not duplicate audit');
 perform pg_temp.check_true((select status='returned' from public.items where id=item) and (select status='fulfilled' and closed_at is not null from public.claims where id=c),'return atomically fulfills claim/item');
 perform set_config('request.jwt.claim.sub',owner1::text,true);
 perform pg_temp.expect_error('CONFLICT','submit_claim','maple-school',item,'{"evidenceText":"Cannot claim an item already returned."}');
 perform set_config('request.jwt.claim.sub',staff::text,true);
 c:=(public.backend_dispatch('submit_claim','maple-school',second_item,'{"evidenceText":"Self-claim to verify a different staff reviewer."}')->'data'->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',admin::text,true);
 perform public.backend_dispatch('review_claim','maple-school',c,'{"expectedVersion":1,"decision":"approve"}');
 perform set_config('request.jwt.claim.sub',staff::text,true);
 perform pg_temp.expect_error('FORBIDDEN','return_claim','maple-school',c,'{"expectedVersion":2,"ownershipVerified":true}');
 perform set_config('request.jwt.claim.sub',admin::text,true);
 perform public.backend_dispatch('cancel_claim','maple-school',c,'{"expectedVersion":2}');
 perform set_config('request.jwt.claim.sub',owner2::text,true);
 c:=(public.backend_dispatch('submit_claim','maple-school',second_item,'{"evidenceText":"Pending claim should close when item is archived."}')->'data'->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',staff::text,true);
 j:=public.backend_dispatch('staff_item','maple-school',second_item);
 perform public.backend_dispatch('archive_item','maple-school',second_item,jsonb_build_object('expectedVersion',(j->'data'->>'version')::int));
 perform pg_temp.check_true((select status='rejected' and decision_reason='item_unavailable' from public.claims where id=c),'archive rejects submitted claims');
 perform pg_temp.check_true((select bool_and(actor_id is not null and request_id is not null and action not like '%secret%' and entity_type in ('claim','item')) from public.audit_events),'audit records metadata only');
 -- Owner1 has three successes so far. Withdraw/resubmit on a fresh item until five.
 j:=public.backend_dispatch('create_item','maple-school',null,payload); second_item:=(j->'data'->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',owner1::text,true);
 for count_before in 1..2 loop
  c:=(public.backend_dispatch('submit_claim','maple-school',second_item,'{"evidenceText":"Evidence for rate-limit verification synthetic only."}')->'data'->>'id')::uuid;
  perform public.backend_dispatch('withdraw_claim','maple-school',c,'{"expectedVersion":1}');
 end loop;
 perform pg_temp.expect_error('RATE_LIMITED','submit_claim','maple-school',second_item,'{"evidenceText":"Sixth successful submission would exceed quota."}');
 perform set_config('request.jwt.claim.sub','',true);
 perform pg_temp.expect_error('UNAUTHORIZED','own_claims',null);
 perform pg_temp.expect_error('VALIDATION_ERROR','arbitrary_sql','maple-school',null,'{}');
end $$;
reset role;
rollback;
