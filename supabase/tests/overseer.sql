\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('41000000-0000-4000-8000-000000000001'),('41000000-0000-4000-8000-000000000002'),('41000000-0000-4000-8000-000000000003'),('41000000-0000-4000-8000-000000000004');
insert into public.memberships(organization_id,user_id,role) values
 ('10000000-0000-4000-8000-000000000001','41000000-0000-4000-8000-000000000001','staff'),
 ('10000000-0000-4000-8000-000000000002','41000000-0000-4000-8000-000000000002','staff');
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
create function pg_temp.expect_error(expected text,act text,target uuid default null,payload jsonb default '{}') returns void language plpgsql as $$
begin
 begin perform public.backend_dispatch(act,'maple-school',target,payload); exception when raise_exception then
  if sqlerrm=expected then raise notice 'PASS: % rejects with %',act,expected; return; end if; raise;
 end;
 raise exception 'FAIL: % expected %',act,expected;
end $$;
set local role authenticated;
do $$
declare a uuid; b uuid; c uuid; j jsonb; first_page jsonb; second_page jsonb;
 payload jsonb:='{"title":"Overseer synthetic case","publicDescription":"A blue synthetic case for a test.","category":"bag","color":"blue","publicLocation":"Library","foundDate":"2026-01-01","identifyingDetails":"Private synthetic green star","storageLocation":"Staff-only cabinet"}';
begin
 perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000001',true);
 a:=(public.backend_dispatch('create_item','maple-school',null,payload)->'data'->>'id')::uuid;
 b:=(public.backend_dispatch('create_item','maple-school',null,payload||'{"foundDate":"2026-01-02"}')->'data'->>'id')::uuid;
 j:=public.backend_dispatch('items','maple-school',null,'{"from":"2026-01-01","to":"2026-01-01"}');
 perform pg_temp.check_true(exists(select 1 from jsonb_array_elements(j->'data')x where x->>'id'=a::text) and not exists(select 1 from jsonb_array_elements(j->'data')x where x->>'id'=b::text),'inclusive date bounds apply before listing');
 j:=public.backend_dispatch('search','maple-school',null,'{"query":"Overseer","from":"2026-01-02","to":"2026-01-02","limit":1}');
 perform pg_temp.check_true(j->'data'->0->'item'->>'id'=b::text,'date bounds apply before ranking/limit');
 perform pg_temp.expect_error('VALIDATION_ERROR','items',null,'{"from":"2026-02-30"}');
 perform pg_temp.expect_error('VALIDATION_ERROR','search',null,'{"query":"case","from":"2026-02-01","to":"2026-01-01"}');
 perform pg_temp.expect_error('VALIDATION_ERROR','items',null,'{"from":null}');
 perform pg_temp.expect_error('VALIDATION_ERROR','items',null,'{"to":"yesterday"}');
 perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000003',true);
 c:=(public.backend_dispatch('submit_claim','maple-school',a,'{"evidenceText":"Synthetic ownership story with a green star."}')->'data'->>'id')::uuid;
 perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000001',true);
 perform pg_temp.expect_error('VALIDATION_ERROR','review_claim',c,'{"expectedVersion":1,"decision":"reject","privateNote":"Private only"}');
 perform pg_temp.expect_error('VALIDATION_ERROR','review_claim',c,'{"expectedVersion":1,"decision":"reject","claimantReason":" "}');
 perform pg_temp.expect_error('VALIDATION_ERROR','review_claim',c,'{"expectedVersion":1,"decision":"approve","claimantReason":"Unrelated reason"}');
 j:=public.backend_dispatch('review_claim','maple-school',c,'{"expectedVersion":1,"decision":"reject","claimantReason":"The supplied details do not match. Contact staff for help.","privateNote":"Private internal green-star comparison"}');
 perform pg_temp.check_true(j->'data'->>'claimantReason'='The supplied details do not match. Contact staff for help.' and j->'data'->>'privateReviewNote'='Private internal green-star comparison','public reason and private note stored separately');
 first_page:=public.staff_item_activity('maple-school',a,null,1);
 perform pg_temp.check_true(jsonb_array_length(first_page->'data')=1 and first_page->'page'->>'nextCursor' is not null,'item activity bounded with cursor');
 second_page:=public.staff_item_activity('maple-school',a,(first_page->'page'->>'nextCursor')::uuid,50);
 perform pg_temp.check_true(not exists(select 1 from jsonb_array_elements(second_page->'data')x where x->>'id'=first_page->'data'->0->>'id'),'activity cursor does not repeat');
 j:=public.staff_item_activity('maple-school',a);
 perform pg_temp.check_true(jsonb_array_length(j->'data')=3 and not exists(select 1 from jsonb_array_elements(j->'data')x where x->>'entityId'=b::text),'history contains only target item and its claims');
 perform pg_temp.check_true(j::text not like '%green-star%' and j::text not like '%green star%' and j::text not like '%cabinet%','activity excludes evidence and private notes');
 perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000003',true);
 j:=public.backend_dispatch('own_claims');
 perform pg_temp.check_true(j->'data'->0->>'claimantReason'='The supplied details do not match. Contact staff for help.' and j::text not like '%internal%' and not(j->'data'->0?'privateReviewNote'),'owner receives safe reason without private staff note');
 begin perform public.staff_item_activity('maple-school',a); raise exception 'FAIL claimant activity'; exception when raise_exception then if sqlerrm<>'NOT_FOUND' then raise; end if; raise notice 'PASS: claimant denied staff activity'; end;
 perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000004',true);
 perform pg_temp.check_true(jsonb_array_length(public.backend_dispatch('own_claims')->'data')=0,'another claimant sees neither reason nor evidence');
 perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000002',true);
 begin perform public.staff_item_activity('maple-school',a); raise exception 'FAIL foreign staff activity'; exception when raise_exception then if sqlerrm<>'NOT_FOUND' then raise; end if; raise notice 'PASS: cross-school staff activity denied'; end;
 perform set_config('request.jwt.claim.sub','41000000-0000-4000-8000-000000000001',true);
 begin perform public.staff_item_activity('maple-school',a,null,51); raise exception 'FAIL limit'; exception when raise_exception then if sqlerrm<>'VALIDATION_ERROR' then raise; end if; raise notice 'PASS: activity limit bounded in database'; end;
end $$;
rollback;
