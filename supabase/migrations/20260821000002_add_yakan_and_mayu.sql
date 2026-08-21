-- Curated Vila da Serra additions validated with Google Places. Ratings and
-- reviews remain derived only from GODINNER user activity.
insert into public.restaurants (
  id, slug, name, address, city, neighborhood, latitude, longitude,
  category, cuisines, price_range, phone, website, google_place_id, status
)
values
  ('40000000-0000-4000-8000-000000000011', 'yakan', 'Yakan', 'Alameda Oscar Niemeyer, 1033, loja 3, Vila da Serra, Nova Lima-MG, 34006-065', 'Nova Lima', 'Vila da Serra', -19.9769411, -43.9409232, 'restaurant', array['Contemporânea'], '$$$$', '(31) 98496-8791', 'https://www.yakan.com.br/', 'ChIJTxZUqLGZpgAR_muXLTkogpE', 'published'),
  ('40000000-0000-4000-8000-000000000012', 'mayu', 'Restaurante Mayu', 'Alameda Oscar Niemeyer, 975, Vila da Serra, Nova Lima-MG, 34000-000', 'Nova Lima', 'Vila da Serra', -19.9775699, -43.9416226, 'restaurant', array['Japonesa'], '$$$', '(31) 3225-6644', 'http://www.mayu.com.br/', 'ChIJI0OdpHSZpgARgjFsuKXrYcQ', 'published')
on conflict (slug) do update set
  name = excluded.name,
  address = excluded.address,
  city = excluded.city,
  neighborhood = excluded.neighborhood,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  category = excluded.category,
  cuisines = excluded.cuisines,
  price_range = excluded.price_range,
  phone = excluded.phone,
  website = excluded.website,
  google_place_id = excluded.google_place_id,
  status = 'published';
