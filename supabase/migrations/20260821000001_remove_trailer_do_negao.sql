-- Remove the explicitly excluded curated entry. Related list items or reviews,
-- if any, cascade through the existing foreign keys.
delete from public.restaurants
where id = '40000000-0000-4000-8000-000000000008'
  and slug = 'trailer-do-negao-vila-da-serra';
