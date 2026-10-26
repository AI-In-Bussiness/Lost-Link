-- Shared fixed-hour budget; no queries, user identifiers or provider credentials retained.
begin;
create table private.semantic_search_budget (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 window_start timestamptz not null,
 attempts integer not null check (attempts between 1 and 20)
);
revoke all on private.semantic_search_budget from public, anon, authenticated;
create function public.reserve_semantic_search(p_org_slug text) returns boolean
language plpgsql security definer set search_path='' as $$
declare org_id uuid; reserved integer;
begin
 select id into org_id from public.organizations where slug=p_org_slug and published;
 if org_id is null then return false; end if;
 insert into private.semantic_search_budget as b values (org_id,date_trunc('hour',now()),1)
 on conflict (organization_id) do update
 set window_start=excluded.window_start, attempts=case when b.window_start=excluded.window_start then b.attempts+1 else 1 end
 where b.window_start<>excluded.window_start or b.attempts<20
 returning attempts into reserved;
 return reserved is not null;
end $$;
revoke all on function public.reserve_semantic_search(text) from public;
grant execute on function public.reserve_semantic_search(text) to anon, authenticated;
commit;
