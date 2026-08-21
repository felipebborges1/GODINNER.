-- Curated Belo Horizonte expansion, verified against Google Places on 2026-08-21.
-- This import contains public business details only. Ratings, reviews and restaurant
-- photos remain derived from GODINNER activity and the existing Places integration.

insert into public.restaurants (
  id, slug, name, address, city, neighborhood, latitude, longitude,
  category, cuisines, price_range, phone, website, google_place_id, status
)
values
  -- Buritis: varied culinary formats, from sushi and Italian to barbecue and bars.
  ('50000000-0000-4000-8000-000000000001', 'mercado-da-boca-buritis', 'Mercado da Boca Buritis', 'Av. Professor Mário Werneck, 1973, Buritis, Belo Horizonte-MG, 30575-180', 'Belo Horizonte', 'Buritis', -19.9728946, -43.9671061, 'restaurant', array['Food Hall'], '$$', '(31) 3995-2798', 'https://daboca.com.br/', 'ChIJr0nm7MGXpgARNHis6Azz1XE', 'published'),
  ('50000000-0000-4000-8000-000000000002', 'piu-braziliano-buritis', 'Piu Braziliano', 'Av. Professor Mário Werneck, 1441, Buritis, Belo Horizonte-MG, 30455-610', 'Belo Horizonte', 'Buritis', -19.9690187, -43.9645087, 'restaurant', array['Buffet'], '$$', '(31) 98336-6070', 'https://www.instagram.com/piubrazilianoburitis/', 'ChIJJ-_dBN2XpgAR8AxGowdx-sc', 'published'),
  ('50000000-0000-4000-8000-000000000003', 'picco-skybar-food', 'Picco SkyBar & Food', 'R. José Hemetério Andrade, 1000, Buritis, Belo Horizonte-MG, 30493-180', 'Belo Horizonte', 'Buritis', -19.9793986, -43.9631973, 'bar', array['Coquetéis'], '$$', '(31) 97577-8393', 'http://www.picco.com.br/', 'ChIJnwXvgJe9pgARs6lqTV4QhhI', 'published'),
  ('50000000-0000-4000-8000-000000000004', 'colher-de-pau-buritis', 'Colher de Pau Buritis', 'Av. Professor Mário Werneck, 2161, Buritis, Belo Horizonte-MG, 30575-180', 'Belo Horizonte', 'Buritis', -19.9744785, -43.9675988, 'restaurant', array['Buffet','Churrasco'], '$$', '(31) 99503-1800', 'https://colherdepauburitis.saipos.com/', 'ChIJI1MQ__GXpgARXUnITHs5lK4', 'published'),
  ('50000000-0000-4000-8000-000000000005', 'papagueti-buritis', 'Papagueti', 'R. José Rodrigues Pereira, 1138, loja 06, Buritis, Belo Horizonte-MG, 30455-640', 'Belo Horizonte', 'Buritis', -19.9692582, -43.9626434, 'restaurant', array['Italiana'], '$$', '(31) 99948-5395', 'https://www.papagueti.com.br/', 'ChIJEyxkg72XpgARdpbrih4Jok0', 'published'),
  ('50000000-0000-4000-8000-000000000006', 'madero-container-buritis', 'Madero Container Buritis', 'Av. Professor Mário Werneck, 1080, Buritis, Belo Horizonte-MG, 30455-610', 'Belo Horizonte', 'Buritis', -19.9675809, -43.9619485, 'restaurant', array['Hambúrguer','Americana'], '$$', '(31) 2115-2945', 'https://www.restaurantemadero.com.br/pt/restaurante/mg/belo-horizonte/madero-container-buritis-pt', 'ChIJjaNA49KXpgARe9fccZFxb_w', 'published'),
  ('50000000-0000-4000-8000-000000000007', 'bendito-japa-buritis', 'Bendito Japa', 'Av. Professor Mário Werneck, 1550, Buritis, Belo Horizonte-MG, 30455-610', 'Belo Horizonte', 'Buritis', -19.9700819, -43.9653186, 'restaurant', array['Japonesa','Sushi'], '$$$', '(31) 92002-6002', null, 'ChIJC-y_EQCXpgAR9XeL6UXrvnU', 'published'),
  ('50000000-0000-4000-8000-000000000008', 'steakbh-oficial', 'SteakBH Oficial', 'R. Maria Heilbuth Surette, 207, lojas 211 a 213, Buritis, Belo Horizonte-MG, 30575-100', 'Belo Horizonte', 'Buritis', -19.9746475, -43.9730574, 'restaurant', array['Carnes','Churrasco'], '$$', '(31) 98239-1344', 'https://wa.link/dsgzcu', 'ChIJFWf4uJyXpgARGARIPykiSC0', 'published'),
  ('50000000-0000-4000-8000-000000000009', 'botequim-buritis', 'Botequim Buritis', 'R. Vitório Magnavacca, 39, Buritis, Belo Horizonte-MG, 30455-730', 'Belo Horizonte', 'Buritis', -19.9703359, -43.9655352, 'bar', array['Boteco'], '$$', '(31) 3166-4333', 'https://www.instagram.com/botequimburitis/', 'ChIJVa7Y-NyXpgARShrrRghutzs', 'published'),
  ('50000000-0000-4000-8000-000000000010', 'canto-de-mainha', 'Bar e Restaurante Canto de Mainha', 'R. Heitor Menin, 115, Buritis, Belo Horizonte-MG, 30455-720', 'Belo Horizonte', 'Buritis', -19.9672884, -43.9643937, 'bar', array['Brasileira','Coquetéis'], '$$', '(31) 99581-5529', 'https://www.instagram.com/cantodemainha/', 'ChIJBQBQ3cKXpgARwJBNVQWURKA', 'published'),

  -- Olhos d’Água: O Italiano is intentionally included alongside distinct formats.
  ('50000000-0000-4000-8000-000000000011', 'o-italiano-restaurante', 'O Italiano Restaurante', 'R. São Vicente, 155, Olhos d’Água, Belo Horizonte-MG, 30390-570', 'Belo Horizonte', 'Olhos d’Água', -19.9902293, -43.9603680, 'restaurant', array['Italiana'], '$$$$', '(31) 99767-5190', 'http://www.oitalianorestaurante.com.br/', 'ChIJMeJf3xq9pgAR_XIq15X8UlI', 'published'),
  ('50000000-0000-4000-8000-000000000012', 'valle-gastronomico', 'Valle Gastronômico', 'R. Santa Rita, 221, Olhos d’Água, Belo Horizonte-MG, 30514-125', 'Belo Horizonte', 'Olhos d’Água', -19.9891647, -43.9613312, 'restaurant', array[]::text[], '$$$', '(31) 98470-9518', 'https://vallegastronomico.com.br/', 'ChIJ56LF9va9pgARTXIf43p4OGU', 'published'),
  ('50000000-0000-4000-8000-000000000013', 'pescador-cozinha-do-litoral', 'Pescador - Cozinha do Litoral', 'R. Adriano Chaves e Matos, 447, Olhos d’Água, Belo Horizonte-MG, 30390-552', 'Belo Horizonte', 'Olhos d’Água', -19.9905278, -43.9583056, 'restaurant', array['Frutos do Mar'], '$$', '(31) 99066-5652', null, 'ChIJ-7GvcwC9pgARYVQpmczNoek', 'published'),
  ('50000000-0000-4000-8000-000000000014', 'choperia-villa-alema', 'Choperia Villa Alemã', 'R. Adriano Chaves e Matos, 447, Olhos d’Água, Belo Horizonte-MG, 30390-402', 'Belo Horizonte', 'Olhos d’Água', -19.9905397, -43.9582058, 'bar', array['Alemã','Churrasco'], '$$', '(31) 98211-0622', 'https://www.instagram.com/choperia.villaalema/', 'ChIJBUxay3CbpgARau8B9yxIGmA', 'published'),
  ('50000000-0000-4000-8000-000000000015', 'temperinho-da-mamae', 'Temperinho da Mamãe', 'R. Gabriela de Melo, 484, Olhos d’Água, Belo Horizonte-MG, 30390-070', 'Belo Horizonte', 'Olhos d’Água', -19.9877833, -43.9648728, 'restaurant', array['Brasileira'], '$$', '(31) 3567-5352', null, 'ChIJbUbrRUK9pgARLcVLTjQ_uL0', 'published')
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

do $$
begin
  if (
    select count(*) from public.restaurants
    where id::text like '50000000-0000-4000-8000-%'
  ) <> 15 then
    raise exception 'Expected 15 curated Buritis and Olhos d’Água restaurants after import';
  end if;
end;
$$;
