begin;
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; raise notice 'PASS: %',label; end $$;
-- Separate synthetic schools, so existing local budgets are untouched.
insert into public.organizations(id,slug,name,published) values
 ('45000000-0000-4000-8000-000000000001','semantic-budget-test','Synthetic quota test',true),
 ('45000000-0000-4000-8000-000000000002','semantic-private-test','Synthetic private test',false);
set local role anon;
do $$ begin
 perform pg_temp.check_true(not public.reserve_semantic_search('missing-school'),'missing school reserves nothing');
 perform pg_temp.check_true(not public.reserve_semantic_search('semantic-private-test'),'unpublished school reserves nothing');
 for i in 1..20 loop
  perform pg_temp.check_true(public.reserve_semantic_search('semantic-budget-test'),'atomic budget permits attempt '||i);
 end loop;
 perform pg_temp.check_true(not public.reserve_semantic_search('semantic-budget-test'),'attempt 21 denied');
 begin
  perform * from private.semantic_search_budget;
  raise exception 'FAIL private budget read';
 exception when insufficient_privilege then raise notice 'PASS: budget not readable by anonymous users'; end;
end $$;
reset role;
update private.semantic_search_budget set window_start=window_start-interval '1 hour' where organization_id='45000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.check_true(public.reserve_semantic_search('semantic-budget-test'),'new hour resets budget');
select pg_temp.check_true(not public.reserve_semantic_search('semantic-private-test'),'authenticated caller cannot reserve unpublished school');
rollback;
