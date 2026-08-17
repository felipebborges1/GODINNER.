alter table public.restaurants
  add column if not exists google_place_id text;

comment on column public.restaurants.google_place_id is
  'Stable Google Maps Place ID. Volatile photo names and photo URLs are never persisted.';

create unique index if not exists restaurants_google_place_id_unique
  on public.restaurants (google_place_id)
  where google_place_id is not null;

update public.restaurants as restaurant
set google_place_id = places.place_id
from (values
  ('a-forja-taverna', 'ChIJod5godKZpgARA31cV-GeWmM'),
  ('a2-bistro', 'ChIJdxPWi26bpgARhdkSGuSs2HY'),
  ('aje-bistro-bar', 'ChIJJcG5Z62bpgARWTgEKhhH7I0'),
  ('buffet-bhagwan', 'ChIJ8TgIWj2apgAR3xelOfqM9PY'),
  ('dartagnan', 'ChIJS2cf9GGXpgARXdJdruVzQ4g'),
  ('dorian-cacao-venezuela', 'ChIJFS6JMOnVUKkRlgS-EQpyDaA'),
  ('glouton', 'ChIJFeUR4WGXpgARXjcWkFaBptY'),
  ('gumbo-soulfood', 'ChIJzQ9LkjOXpgARL9M91tupJSE'),
  ('indian-gourmet', 'ChIJaWFR22GXpgAR6bZ2nKSQFjE'),
  ('inka-peruano-e-japones', 'ChIJj_QAt5yXpgARcZ5pWO_h_g0'),
  ('lygia-brasa-bistro', 'ChIJczawHxaZpgARWT_ZJ5PK4Hg'),
  ('massala-savassi', 'ChIJUYA-Fo-ZpgARQQljIWoy8_8'),
  ('mitra-restaurante', 'ChIJQ8G6MwC9pgAREx9EU-Ed7Fc'),
  ('morada-mexicana', 'ChIJD9I9M8WZpgARFqaHUaBpE7E'),
  ('namaste', 'ChIJp18US2qXpgARWisHRuFUrYo'),
  ('neckartal', 'ChIJ4eL8HteZpgARy7dfiNC1QU4'),
  ('ninita', 'ChIJ-f63dbCXpgARBgk6hif7cgE'),
  ('olegario-vila-da-serra', 'ChIJnzRgb_-XpgARqcvnaIY3lyU'),
  ('almanaque-vila-da-serra', 'ChIJ-S1YYxOZpgARNmHXA1mcWwk'),
  ('alameda-288', 'ChIJR0Zpvf-XpgAR0P0CzTTT0s0'),
  ('bar-do-lopes-vila-da-serra', 'ChIJ4eR3Ktm9pgARCmBSgRBTbK0'),
  ('ah-bon-bistrot-vila-da-serra', 'ChIJOztvRQOYpgARE27G6zbGWZ8'),
  ('olivia-mediterraneo', 'ChIJx5_1hdmZpgARqlnjZeUSLyc'),
  ('la-macelleria-vila-da-serra', 'ChIJl9w9_QKYpgARKn5tFhiGSL8'),
  ('pobre-juan-bh-shopping', 'ChIJod01Yoe9pgARhDiZT3mUTK0'),
  ('paladar-do-cubano', 'ChIJ9z_xcayXpgARVaAOzsKBsLs'),
  ('taberna-baltazar', 'ChIJz0eFyruZpgARZd0c9IUnCVw'),
  ('taste-vin', 'ChIJ5ZEg6mGXpgARfqz7P5hilHM'),
  ('zaika-tandoor', 'ChIJs-r3SQeZpgAR8T82TFy4muY')
) as places(slug, place_id)
where restaurant.slug = places.slug
  and restaurant.google_place_id is distinct from places.place_id;

update public.restaurants
set address = 'R. Bárbara Heliodora, 71, Lourdes, Belo Horizonte-MG, 30180-130'
where slug = 'glouton'
  and address is distinct from 'R. Bárbara Heliodora, 71, Lourdes, Belo Horizonte-MG, 30180-130';

do $$
begin
  if (
    select count(*)
    from public.restaurants
    where id::text like '30000000-0000-4000-8000-%'
      and google_place_id is not null
  ) <> 29 then
    raise exception 'Expected 29 matched Beta restaurants with Google Place IDs';
  end if;
end;
$$;
