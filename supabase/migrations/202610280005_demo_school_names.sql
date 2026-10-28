-- Rename only the two existing demo school labels; preserve links and memberships.
-- Inventory and accounts remain synthetic.
update public.organizations
set name = 'Flint Hill School'
where id = '10000000-0000-4000-8000-000000000001'
  and name in ('Maple School (fictional)', 'Maple School', 'Maple Hill School');

update public.organizations
set name = 'Fairfax High School'
where id = '10000000-0000-4000-8000-000000000002'
  and name in ('Cedar School (fictional)', 'Cedar School', 'Cedar Grove School');
