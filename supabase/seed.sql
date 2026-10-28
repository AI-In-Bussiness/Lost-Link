-- Synthetic inventory only. Auth users are provisioned separately; no passwords.
insert into public.organizations(id,slug,name,published) values
 ('10000000-0000-4000-8000-000000000001','maple-school','Flint Hill School',true),
 ('10000000-0000-4000-8000-000000000002','cedar-school','Fairfax High School',true)
on conflict(id) do nothing;
insert into public.items(id,organization_id,title,public_description,category,color,public_location,found_date) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Black athletic backpack','Black bag with a white sports logo.','bag','black','Gym entrance',current_date-1),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Blue water bottle','Reusable blue bottle.','bottle','blue','Library',current_date-2)
on conflict(id) do nothing;
insert into public.item_private_details(item_id,organization_id,identifying_details,storage_location) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Synthetic secret: yellow dinosaur keyring inside.','Synthetic cabinet A'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Synthetic secret: purple star underneath.','Synthetic cabinet B')
on conflict(item_id) do nothing;
