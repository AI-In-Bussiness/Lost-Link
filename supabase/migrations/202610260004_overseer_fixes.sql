-- Overseer response: additive date filters, separate claimant-facing rejection text,
-- and bounded item-scoped activity. Earlier migrations remain unchanged.
begin;
alter table public.claims add column claimant_reason text check(claimant_reason is null or length(trim(claimant_reason)) between 5 and 500);
create or replace function private.backend_claim_json(target uuid, staff boolean default false) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',c.id,'itemId',c.item_id,'organizationSlug',o.slug,'itemTitle',i.title,'status',c.status,'evidenceText',c.evidence_text,'submittedAt',c.submitted_at,'reviewedAt',c.reviewed_at,'decisionReason',c.decision_reason,'claimantReason',c.claimant_reason,'closedAt',c.closed_at,'evidenceDeletedAt',c.evidence_deleted_at,'version',c.version)
 || case when staff then jsonb_build_object('claimantId',c.claimant_id,'reviewedBy',c.reviewed_by,'privateReviewNote',c.private_review_note) else '{}'::jsonb end
 from public.claims c join public.organizations o on o.id=c.organization_id join public.items i on i.id=c.item_id and i.organization_id=c.organization_id where c.id=target
$$;
create or replace function public.backend_dispatch(p_action text,p_org_slug text default null,p_id uuid default null,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); org public.organizations%rowtype; item public.items%rowtype; claim public.claims%rowtype;
 allowed text[]; key text; n integer:=20; after_id uuid; expected integer; staff boolean:=false;
 result jsonb; rows jsonb; next_cursor uuid; req uuid:=gen_random_uuid(); created uuid; previous text;
 query_text text; category_filter text; color_filter text; status_filter text; filter_item uuid; new_status text; from_date date; to_date date;
begin
 allowed:=case p_action
 when 'organization' then array[]::text[] when 'item' then array[]::text[] when 'staff_item' then array[]::text[]
 when 'items' then array['q','category','color','from','to','limit','cursor']
 when 'search' then array['query','category','color','from','to','limit']
 when 'staff_items' then array['status','limit','cursor']
 when 'own_claims' then array['limit','cursor']
 when 'staff_claims' then array['status','itemId','limit','cursor']
 when 'create_item' then array['title','publicDescription','category','color','publicLocation','foundDate','identifyingDetails','storageLocation']
 when 'update_item' then array['title','publicDescription','category','color','publicLocation','foundDate','identifyingDetails','storageLocation','expectedVersion']
 when 'archive_item' then array['expectedVersion']
 when 'submit_claim' then array['evidenceText']
 when 'withdraw_claim' then array['expectedVersion']
 when 'review_claim' then array['decision','expectedVersion','privateNote','claimantReason']
 when 'cancel_claim' then array['expectedVersion','privateNote']
 when 'return_claim' then array['expectedVersion','ownershipVerified']
 else null end;
 if allowed is null then raise exception 'VALIDATION_ERROR'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>20000 then raise exception 'VALIDATION_ERROR'; end if;
 for key in select jsonb_object_keys(p_payload) loop
  if not(key=any(allowed)) then raise exception 'VALIDATION_ERROR'; end if;
  if key in ('limit','expectedVersion') then
   if jsonb_typeof(p_payload->key)<>'number' or (p_payload->>key)!~'^[0-9]+$' then raise exception 'VALIDATION_ERROR'; end if;
  elsif key='ownershipVerified' then
   if jsonb_typeof(p_payload->key)<>'boolean' then raise exception 'VALIDATION_ERROR'; end if;
  elsif jsonb_typeof(p_payload->key)<>'string' then raise exception 'VALIDATION_ERROR'; end if;
 end loop;
 if p_payload ? 'limit' then n:=(p_payload->>'limit')::integer; end if;
 if n<1 or n>50 then raise exception 'VALIDATION_ERROR'; end if;
 if p_payload ? 'cursor' then after_id:=(p_payload->>'cursor')::uuid; end if;
 if p_payload ? 'expectedVersion' then expected:=(p_payload->>'expectedVersion')::integer; if expected<1 then raise exception 'VALIDATION_ERROR'; end if; end if;
 if p_action not in ('organization','items','item','search') and actor is null then raise exception 'UNAUTHORIZED'; end if;
 if p_action='own_claims' then
  select coalesce(jsonb_agg(private.backend_claim_json(c.id,false) order by c.id),'[]'::jsonb) into rows
  from (select id from public.claims where claimant_id=actor and (after_id is null or id>after_id) order by id limit n+1)c;
  if jsonb_array_length(rows)>n then next_cursor:=(rows->(n-1)->>'id')::uuid; rows:=rows - n; end if;
  return jsonb_build_object('data',rows,'page',jsonb_build_object('nextCursor',next_cursor));
 end if;
 if p_org_slug is null or length(p_org_slug)>100 then raise exception 'VALIDATION_ERROR'; end if;
 select * into org from public.organizations where slug=p_org_slug;
 if not found then raise exception 'NOT_FOUND'; end if;
 staff:=actor is not null and private.is_staff(org.id);
 if p_action in ('staff_items','staff_item','create_item','update_item','archive_item','staff_claims','review_claim','cancel_claim','return_claim') and not staff then raise exception 'NOT_FOUND'; end if;
 if p_action in ('organization','items','item','search','submit_claim') and not org.published then raise exception 'NOT_FOUND'; end if;
 if p_action='organization' then return jsonb_build_object('data',jsonb_build_object('id',org.id,'slug',org.slug,'name',org.name)); end if;
 if p_action in ('items','search','staff_items') then
  query_text:=lower(trim(coalesce(p_payload->>'query',p_payload->>'q','')));
  category_filter:=p_payload->>'category'; color_filter:=p_payload->>'color'; status_filter:=p_payload->>'status';
  if length(query_text)>300 or (p_action='search' and length(query_text)<1) then raise exception 'VALIDATION_ERROR'; end if;
  if category_filter is not null and category_filter not in ('bag','clothing','electronics','keys','bottle','other') then raise exception 'VALIDATION_ERROR'; end if;
  if color_filter is not null and (length(color_filter) not between 1 and 40 or color_filter!~'^[a-z]+([ -][a-z]+)*$') then raise exception 'VALIDATION_ERROR'; end if;
  if status_filter is not null and status_filter not in ('available','reserved','returned','archived') then raise exception 'VALIDATION_ERROR'; end if;
  for key in select unnest(array['from','to']) loop
   if p_payload ? key then
    if (p_payload->>key)!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'VALIDATION_ERROR'; end if;
    if key='from' then from_date:=(p_payload->>key)::date; else to_date:=(p_payload->>key)::date; end if;
   end if;
  end loop;
  if from_date>to_date then raise exception 'VALIDATION_ERROR'; end if;
  with candidates as (
   select i.*, (select count(*) from regexp_split_to_table(query_text,'[^[:alnum:]]+') token
    where length(token)>1 and token not in ('the','with','and','lost','my','near','at','in','is','it','of','to','for','was','has','have','an')
    and (position(token in lower(i.title||' '||i.public_description||' '||i.category||' '||i.color||' '||i.public_location))>0))::integer as score
   from public.items i where i.organization_id=org.id and (p_action='staff_items' or i.status='available')
    and (status_filter is null or i.status=status_filter) and (category_filter is null or i.category=category_filter) and (color_filter is null or i.color=color_filter)
    and (after_id is null or i.id>after_id)
    and (from_date is null or i.found_date>=from_date) and (to_date is null or i.found_date<=to_date)
  ), chosen as (
   select c.id,c.score,c.found_date from candidates c where query_text='' or c.score>0
   order by case when p_action='search' then c.score end desc,case when p_action='search' then c.found_date end desc,c.id limit n+1
  )
  select coalesce(jsonb_agg(case when p_action='search' then jsonb_build_object('item',private.backend_item_json(c.id,false),'reasons',jsonb_build_array('Matching public item details'),'method','structured') else private.backend_item_json(c.id,p_action='staff_items') end order by case when p_action='search' then c.score end desc,case when p_action='search' then c.found_date end desc,c.id),'[]'::jsonb) into rows from chosen c;
  if jsonb_array_length(rows)>n then
   if p_action<>'search' then next_cursor:=(rows->(n-1)->>'id')::uuid; end if; rows:=rows-n;
  end if;
  if p_action='search' then return jsonb_build_object('data',rows); end if;
  return jsonb_build_object('data',rows,'page',jsonb_build_object('nextCursor',next_cursor));
 end if;
 if p_action='staff_claims' then
  status_filter:=p_payload->>'status'; if p_payload ? 'itemId' then filter_item:=(p_payload->>'itemId')::uuid; end if;
  if status_filter is not null and status_filter not in ('submitted','approved','rejected','withdrawn','fulfilled','cancelled') then raise exception 'VALIDATION_ERROR'; end if;
  select coalesce(jsonb_agg(private.backend_claim_json(c.id,true) order by c.id),'[]'::jsonb) into rows
  from (select id from public.claims where organization_id=org.id and (after_id is null or id>after_id) and (status_filter is null or status=status_filter) and (filter_item is null or item_id=filter_item) order by id limit n+1)c;
  if jsonb_array_length(rows)>n then next_cursor:=(rows->(n-1)->>'id')::uuid; rows:=rows-n; end if;
  return jsonb_build_object('data',rows,'page',jsonb_build_object('nextCursor',next_cursor));
 end if;
 if p_action in ('create_item','update_item') then
  for key in select jsonb_object_keys(p_payload) loop
   if key in ('title','publicDescription','publicLocation','identifyingDetails','storageLocation') then
    if length(trim(p_payload->>key))<1 or length(p_payload->>key)>(case key when 'title' then 100 when 'publicDescription' then 1000 when 'publicLocation' then 150 when 'identifyingDetails' then 2000 else 150 end) then raise exception 'VALIDATION_ERROR'; end if;
   elsif key='category' and (p_payload->>key) not in ('bag','clothing','electronics','keys','bottle','other') then raise exception 'VALIDATION_ERROR';
   elsif key='color' and (length(p_payload->>key) not between 1 and 40 or (p_payload->>key)!~'^[a-z]+([ -][a-z]+)*$') then raise exception 'VALIDATION_ERROR';
   elsif key='foundDate' and (p_payload->>key)!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'VALIDATION_ERROR'; end if;
  end loop;
 end if;
 if p_action='create_item' then
  if not(p_payload ?& array['title','publicDescription','category','color','publicLocation','foundDate','identifyingDetails','storageLocation']) then raise exception 'VALIDATION_ERROR'; end if;
  insert into public.items(organization_id,title,public_description,category,color,public_location,found_date,created_by)
  values(org.id,trim(p_payload->>'title'),trim(p_payload->>'publicDescription'),p_payload->>'category',p_payload->>'color',trim(p_payload->>'publicLocation'),(p_payload->>'foundDate')::date,actor) returning id into created;
  insert into public.item_private_details(organization_id,item_id,identifying_details,storage_location) values(org.id,created,trim(p_payload->>'identifyingDetails'),trim(p_payload->>'storageLocation'));
  perform private.backend_audit(org.id,'item',created,'item_created',null,'available',req);
  return jsonb_build_object('data',private.backend_item_json(created,true));
 end if;
 if p_id is null then raise exception 'VALIDATION_ERROR'; end if;
 if p_action='submit_claim' then
  if length(trim(p_payload->>'evidenceText')) not between 20 and 2000 or not(p_payload ? 'evidenceText') then raise exception 'VALIDATION_ERROR'; end if;
  -- Serialize the successful-submission limiter for this identity across all items/orgs.
  perform pg_advisory_xact_lock(hashtextextended('lostlink:claims:'||actor::text,0));
  if (select count(*) from public.audit_events where actor_id=actor and action='claim_submitted' and occurred_at>=now()-interval '1 hour')>=5 then raise exception 'RATE_LIMITED'; end if;
 end if;
 if p_action in ('item','staff_item','update_item','archive_item','submit_claim') then
  if p_action in ('item','staff_item') then
   select * into item from public.items where id=p_id and organization_id=org.id;
  else select * into item from public.items where id=p_id and organization_id=org.id for update; end if;
  if not found or (p_action='item' and item.status<>'available') then raise exception 'NOT_FOUND'; end if;
  if p_action in ('item','staff_item') then return jsonb_build_object('data',private.backend_item_json(item.id,p_action='staff_item')); end if;
  if p_action='submit_claim' then
   if item.status<>'available' then raise exception 'CONFLICT'; end if;
   if exists(select 1 from public.claims where item_id=item.id and claimant_id=actor and status in ('submitted','approved')) then raise exception 'CONFLICT'; end if;
   insert into public.claims(organization_id,item_id,claimant_id,evidence_text) values(org.id,item.id,actor,trim(p_payload->>'evidenceText')) returning id into created;
   perform private.backend_audit(org.id,'claim',created,'claim_submitted',null,'submitted',req);
   return jsonb_build_object('data',private.backend_claim_json(created,false));
  end if;
  if expected is null then raise exception 'VALIDATION_ERROR'; end if;
  if expected<>item.version then raise exception 'CONFLICT'; end if;
  if p_action='update_item' then
   if (p_payload-'expectedVersion')='{}'::jsonb then raise exception 'VALIDATION_ERROR'; end if;
   update public.items set title=coalesce(trim(p_payload->>'title'),title),public_description=coalesce(trim(p_payload->>'publicDescription'),public_description),category=coalesce(p_payload->>'category',category),color=coalesce(p_payload->>'color',color),public_location=coalesce(trim(p_payload->>'publicLocation'),public_location),found_date=coalesce((p_payload->>'foundDate')::date,found_date),version=version+1,updated_at=now() where id=item.id;
   update public.item_private_details set identifying_details=coalesce(trim(p_payload->>'identifyingDetails'),identifying_details),storage_location=coalesce(trim(p_payload->>'storageLocation'),storage_location) where item_id=item.id;
   perform private.backend_audit(org.id,'item',item.id,'item_updated',item.status,item.status,req);
  else
   if item.status<>'available' then raise exception 'CONFLICT'; end if;
   update public.items set status='archived',version=version+1,updated_at=now() where id=item.id;
   perform private.backend_reject_competing(org.id,item.id,null,req);
   perform private.backend_audit(org.id,'item',item.id,'item_archived','available','archived',req);
  end if;
  return jsonb_build_object('data',private.backend_item_json(item.id,true));
 end if;
 -- Claim mutations always lock the item before the claim. Tenant/owner checks precede locks.
 select * into claim from public.claims where id=p_id and organization_id=org.id;
 if not found or (p_action='withdraw_claim' and claim.claimant_id<>actor) then raise exception 'NOT_FOUND'; end if;
 select * into item from public.items where id=claim.item_id and organization_id=org.id for update;
 select * into claim from public.claims where id=p_id and organization_id=org.id for update;
 if expected is null then raise exception 'VALIDATION_ERROR'; end if;
 if p_payload ? 'privateNote' and length(p_payload->>'privateNote')>1000 then raise exception 'VALIDATION_ERROR'; end if;
 if p_action='review_claim' then
  if not(p_payload ? 'decision') or (p_payload->>'decision') not in ('approve','reject') then raise exception 'VALIDATION_ERROR'; end if;
  if (p_payload->>'decision')='reject' and (not(p_payload ? 'claimantReason') or length(trim(p_payload->>'claimantReason')) not between 5 and 500) then raise exception 'VALIDATION_ERROR'; end if;
  if (p_payload->>'decision')='approve' and p_payload ? 'claimantReason' then raise exception 'VALIDATION_ERROR'; end if;
  if (p_payload->>'decision')='approve' and claim.claimant_id=actor then raise exception 'FORBIDDEN'; end if;
  -- A repeat with the original pre-transition version is safe; a different stale version is not.
  if (p_payload->>'decision')='approve' and claim.status='approved' and item.status='reserved' and claim.reviewed_by=actor and expected=claim.version-1 then return jsonb_build_object('data',private.backend_claim_json(claim.id,true)); end if;
 elsif p_action='return_claim' then
  if (p_payload->'ownershipVerified') is distinct from 'true'::jsonb then raise exception 'VALIDATION_ERROR'; end if;
  if claim.claimant_id=actor then raise exception 'FORBIDDEN'; end if;
  if claim.status='fulfilled' and item.status='returned' and expected=claim.version-1 then return jsonb_build_object('data',private.backend_claim_json(claim.id,true)); end if;
 end if;
 if expected<>claim.version then raise exception 'CONFLICT'; end if;
 previous:=claim.status;
 if p_action='withdraw_claim' then
  if claim.status<>'submitted' then raise exception 'CONFLICT'; end if; new_status:='withdrawn';
 elsif p_action='review_claim' then
  if claim.status<>'submitted' or item.status<>'available' then raise exception 'CONFLICT'; end if;
  if (p_payload->>'decision')='approve' then
   new_status:='approved'; update public.items set status='reserved',version=version+1,updated_at=now() where id=item.id;
   perform private.backend_reject_competing(org.id,item.id,claim.id,req);
   perform private.backend_audit(org.id,'item',item.id,'item_reserved','available','reserved',req);
  else new_status:='rejected'; end if;
 elsif p_action='cancel_claim' then
  if claim.status<>'approved' or item.status<>'reserved' then raise exception 'CONFLICT'; end if;
  new_status:='cancelled'; update public.items set status='available',version=version+1,updated_at=now() where id=item.id;
  perform private.backend_audit(org.id,'item',item.id,'item_reopened','reserved','available',req);
 elsif p_action='return_claim' then
  if claim.status<>'approved' or item.status<>'reserved' then raise exception 'CONFLICT'; end if;
  new_status:='fulfilled'; update public.items set status='returned',version=version+1,updated_at=now() where id=item.id;
  perform private.backend_audit(org.id,'item',item.id,'item_returned','reserved','returned',req);
 else raise exception 'VALIDATION_ERROR'; end if;
 update public.claims set status=new_status,decision_reason=new_status,claimant_reason=case when new_status='rejected' then trim(p_payload->>'claimantReason') else claimant_reason end,closed_at=case when new_status='approved' then null else now() end,
 reviewed_at=case when p_action='withdraw_claim' then reviewed_at else now() end,reviewed_by=case when p_action='withdraw_claim' then reviewed_by else actor end,
 private_review_note=coalesce(p_payload->>'privateNote',private_review_note),last_activity_at=now(),version=version+1 where id=claim.id;
 perform private.backend_audit(org.id,'claim',claim.id,'claim_'||new_status,previous,new_status,req);
 return jsonb_build_object('data',private.backend_claim_json(claim.id,p_action<>'withdraw_claim'));
exception
 when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range or check_violation or not_null_violation then raise exception 'VALIDATION_ERROR';
 when unique_violation then raise exception 'CONFLICT';
end $$;
revoke all on function public.backend_dispatch(text,text,uuid,jsonb) from public;
grant execute on function public.backend_dispatch(text,text,uuid,jsonb) to anon,authenticated;

-- Safe item history includes only this item's own, claim and photo events.
create function public.staff_item_activity(p_org_slug text,p_item_id uuid,p_after uuid default null,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare org uuid; rows jsonb; next_id uuid;
begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 if p_limit is null or p_limit<1 or p_limit>50 then raise exception 'VALIDATION_ERROR'; end if;
 select id into org from public.organizations where slug=p_org_slug;
 if org is null or not private.is_staff(org) or not exists(select 1 from public.items where id=p_item_id and organization_id=org) then raise exception 'NOT_FOUND'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'actorId',a.actor_id,'action',a.action,'entityType',a.entity_type,'entityId',a.entity_id,'occurredAt',a.occurred_at,'requestId',a.request_id,'previousStatus',a.previous_status,'newStatus',a.new_status) order by a.id),'[]'::jsonb) into rows
 from (select a.* from public.audit_events a where a.organization_id=org and (p_after is null or a.id>p_after) and (
  (a.entity_type='item' and a.entity_id=p_item_id) or
  (a.entity_type='claim' and exists(select 1 from public.claims c where c.id=a.entity_id and c.item_id=p_item_id and c.organization_id=org)) or
  (a.entity_type='photo' and exists(select 1 from public.item_photos p where p.id=a.entity_id and p.item_id=p_item_id and p.organization_id=org))
 ) order by a.id limit p_limit+1)a;
 if jsonb_array_length(rows)>p_limit then next_id:=(rows->(p_limit-1)->>'id')::uuid; rows:=rows-p_limit; end if;
 return jsonb_build_object('data',rows,'page',jsonb_build_object('nextCursor',next_id));
end $$;
revoke all on function public.staff_item_activity(text,uuid,uuid,integer) from public,anon;
grant execute on function public.staff_item_activity(text,uuid,uuid,integer) to authenticated;
commit;
