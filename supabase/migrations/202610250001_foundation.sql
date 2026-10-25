-- Phase 1 foundation. Lifecycle mutations deliberately unavailable until Phase 3.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.organizations (
 id uuid primary key default gen_random_uuid(), slug text unique not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 name text not null check(length(name) between 1 and 100), published boolean not null default false,
 timezone text not null default 'UTC', created_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(display_name) between 1 and 100), created_at timestamptz not null default now()
);
create table public.memberships (
 organization_id uuid not null references public.organizations(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('staff','admin')), created_at timestamptz not null default now(), primary key(organization_id,user_id)
);
create function private.is_staff(org uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.memberships m where m.organization_id=org and m.user_id=auth.uid() and m.role in ('staff','admin'))
$$;
revoke all on function private.is_staff(uuid) from public;
grant execute on function private.is_staff(uuid) to authenticated;
create table public.items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 title text not null check(length(title) between 1 and 100), public_description text not null check(length(public_description) between 1 and 1000),
 category text not null check(category in ('bag','clothing','electronics','keys','bottle','other')),
 color text not null default 'unknown' check(color=lower(color)), public_location text not null check(length(public_location) between 1 and 150),
 found_date date not null, status text not null default 'available' check(status in ('available','reserved','returned','archived')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 version integer not null default 1 check(version>0), unique(organization_id,id)
);
create function private.validate_found_date() returns trigger language plpgsql set search_path='' as $$
declare org_zone text;
begin
 select timezone into org_zone from public.organizations where id=new.organization_id;
 if new.found_date > (now() at time zone coalesce(org_zone,'UTC'))::date then
  raise exception 'found_date cannot be in the future' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function private.validate_found_date() from public;
create trigger items_found_date before insert or update of found_date, organization_id on public.items
 for each row execute function private.validate_found_date();
create table public.item_private_details (
 item_id uuid primary key, organization_id uuid not null, identifying_details text, storage_location text,
 foreign key(organization_id,item_id) references public.items(organization_id,id) on delete cascade
);
create table public.item_photos (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, item_id uuid not null,
 storage_path text not null unique, status text not null default 'pending' check(status in ('pending','published')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 foreign key(organization_id,item_id) references public.items(organization_id,id) on delete cascade,
 check(split_part(storage_path,'/',1)=organization_id::text and split_part(storage_path,'/',2)=item_id::text)
);
create table public.claims (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, item_id uuid not null,
 claimant_id uuid not null references auth.users(id), evidence_text text check(evidence_text is null or length(evidence_text) between 20 and 2000),
 status text not null default 'submitted' check(status in ('submitted','approved','rejected','withdrawn','fulfilled','cancelled')),
 submitted_at timestamptz not null default now(), last_activity_at timestamptz not null default now(), reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id), private_review_note text check(length(private_review_note)<=1000),
 decision_reason text check(decision_reason in ('approved','rejected','item_unavailable','withdrawn','cancelled','fulfilled','expired')),
 closed_at timestamptz, evidence_deleted_at timestamptz, version integer not null default 1 check(version>0),
 foreign key(organization_id,item_id) references public.items(organization_id,id),
 check((evidence_text is null) = (evidence_deleted_at is not null)),
 check((status in ('rejected','withdrawn','fulfilled','cancelled')) = (closed_at is not null))
);
create unique index claims_one_active_owner on public.claims(item_id,claimant_id) where status in ('submitted','approved');
create unique index claims_one_approved on public.claims(item_id) where status='approved';
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), actor_id uuid references auth.users(id),
 action text not null, entity_type text not null, entity_id uuid not null, occurred_at timestamptz not null default now(), request_id uuid not null,
 previous_status text, new_status text
);
create index items_org_status on public.items(organization_id,status,found_date,id);
create index memberships_user on public.memberships(user_id,organization_id);
create index claims_org_status on public.claims(organization_id,status);
create index claims_owner on public.claims(claimant_id);
create index photos_item on public.item_photos(organization_id,item_id);
create index audit_org_time on public.audit_events(organization_id,occurred_at);

-- Revoke Supabase default table grants explicitly. No direct lifecycle writes.
revoke all on public.organizations, public.profiles, public.memberships, public.items, public.item_private_details, public.item_photos, public.claims, public.audit_events from anon, authenticated;
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.items enable row level security;
alter table public.item_private_details enable row level security;
alter table public.item_photos enable row level security;
alter table public.claims enable row level security;
alter table public.audit_events enable row level security;
grant select on public.organizations,public.profiles,public.memberships,public.items,public.item_private_details,public.item_photos,public.claims,public.audit_events to authenticated;
-- Claims owner reads via safe RPC only, because RLS cannot conceal staff-note columns.
create policy organizations_staff on public.organizations for select to authenticated using(private.is_staff(id));
create policy profiles_self on public.profiles for select to authenticated using(id=auth.uid());
create policy memberships_self on public.memberships for select to authenticated using(user_id=auth.uid());
create policy items_staff on public.items for select to authenticated using(private.is_staff(organization_id));
create policy item_private_staff on public.item_private_details for select to authenticated using(private.is_staff(organization_id));
create policy photos_staff on public.item_photos for select to authenticated using(private.is_staff(organization_id));
create policy claims_staff on public.claims for select to authenticated using(private.is_staff(organization_id));
create policy audit_staff on public.audit_events for select to authenticated using(private.is_staff(organization_id));

create function public.get_public_organization(org_slug text)
returns table(id uuid,slug text,name text) language sql stable security definer set search_path='' as $$
 select o.id,o.slug,o.name from public.organizations o where o.slug=org_slug and o.published
$$;
create function public.list_public_items(org_slug text, page_size integer default 20)
returns table(id uuid,organization_slug text,title text,public_description text,category text,color text,public_location text,found_date date,photos jsonb)
language sql stable security definer set search_path='' as $$
 select i.id,o.slug,i.title,i.public_description,i.category,i.color,i.public_location,i.found_date,
 coalesce((select jsonb_agg(jsonb_build_object('path',p.storage_path,'alt',i.title) order by p.id) from public.item_photos p where p.organization_id=i.organization_id and p.item_id=i.id and p.status='published'),'[]'::jsonb)
 from public.items i join public.organizations o on o.id=i.organization_id
 where o.slug=org_slug and o.published and i.status='available'
 order by i.found_date desc,i.id limit least(greatest(coalesce(page_size,20),1),50)
$$;
create function public.list_own_claims()
returns table(id uuid,item_id uuid,organization_slug text,item_title text,status text,evidence_text text,submitted_at timestamptz,reviewed_at timestamptz,decision_reason text,closed_at timestamptz,evidence_deleted_at timestamptz,version integer)
language sql stable security definer set search_path='' as $$
 select c.id,c.item_id,o.slug,i.title,c.status,c.evidence_text,c.submitted_at,c.reviewed_at,c.decision_reason,c.closed_at,c.evidence_deleted_at,c.version
 from public.claims c join public.items i on i.id=c.item_id and i.organization_id=c.organization_id join public.organizations o on o.id=c.organization_id
 where c.claimant_id=auth.uid() order by c.submitted_at desc limit 100
$$;
revoke all on function public.get_public_organization(text),public.list_public_items(text,integer),public.list_own_claims() from public;
grant execute on function public.get_public_organization(text),public.list_public_items(text,integer) to anon,authenticated;
grant execute on function public.list_own_claims() to authenticated;

-- Bucket is private even for approved derivatives: select policy can revoke stale listings.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('item-staging','item-staging',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('item-public','item-public',false,5242880,array['image/jpeg','image/png','image/webp']);
create function private.can_read_photo(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.item_photos p join public.items i on i.id=p.item_id and i.organization_id=p.organization_id join public.organizations o on o.id=i.organization_id
 where p.storage_path=object_name and p.status='published' and i.status='available' and o.published)
$$;
revoke all on function private.can_read_photo(text) from public;
grant usage on schema private to anon;
grant execute on function private.can_read_photo(text) to anon,authenticated;
create policy published_photo_read on storage.objects for select to anon,authenticated using(bucket_id='item-public' and private.can_read_photo(name));
create policy staging_staff_read on storage.objects for select to authenticated using(bucket_id='item-staging' and exists(select 1 from public.items i where split_part(name,'/',1)=i.organization_id::text and split_part(name,'/',2)=i.id::text and private.is_staff(i.organization_id)));
create policy staging_staff_insert on storage.objects for insert to authenticated with check(bucket_id='item-staging' and exists(select 1 from public.items i where split_part(name,'/',1)=i.organization_id::text and split_part(name,'/',2)=i.id::text and private.is_staff(i.organization_id)));
-- No client writes to sanitized derivatives or metadata. Publication requires a future trusted re-encoding/review workflow.
commit;
