-- Replace only the five clearly identified development seed restaurants.
-- Reviews, review photos and list items for these records cascade by the existing
-- foreign keys. User-submitted restaurants and all curated Beta entries are kept.
delete from public.restaurants
where id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005'
);

-- Google Place IDs are stable identifiers. Photo names and temporary photo URLs
-- are intentionally not persisted; the existing server-side Places integration
-- resolves photos on demand with the required attribution.
insert into public.restaurants (
  id, slug, name, address, city, neighborhood, latitude, longitude,
  category, cuisines, price_range, phone, website, google_place_id, status
)
values
  ('40000000-0000-4000-8000-000000000001', 'emporio-paraiso-salumeria', 'Empório Paraíso - Salumeria', 'R. Min. Orozimbo Nonato, 215, loja 9, Vila da Serra, Nova Lima-MG, 34006-053', 'Nova Lima', 'Vila da Serra', -19.9844162, -43.9466195, 'restaurant', array['Italiana','Pub'], '$$', '(31) 3786-3120', null, 'ChIJW_Z7NwC9pgARkaN7_T94Z7s', 'published'),
  ('40000000-0000-4000-8000-000000000002', 'brasilero-restaurante-gastrobar', 'Brasilerô Restaurante Gastrobar', 'R. Min. Orozimbo Nonato, 215, loja 5, Vila da Serra, Nova Lima-MG, 34006-053', 'Nova Lima', 'Vila da Serra', -19.9846578, -43.9466768, 'restaurant', array[]::text[], '$$', '(31) 3262-2132', null, 'ChIJZzoyu6G9pgARiVfVWGy2A7I', 'published'),
  ('40000000-0000-4000-8000-000000000003', 'osteritta-papa', 'Osteritta Papà', 'R. Min. Orozimbo Nonato, 215, loja 1, Vila da Serra, Nova Lima-MG, 34006-053', 'Nova Lima', 'Vila da Serra', -19.98414, -43.9469038, 'restaurant', array['Italiana'], '$$$$', '(31) 3965-1818', 'https://www.instagram.com/osterittapapa/', 'ChIJs7g7gnO9pgARndMrhggmNoE', 'published'),
  ('40000000-0000-4000-8000-000000000004', 'vila-21', 'Vila 21', 'Alameda Oscar Niemeyer, 1033, loja 25, Vila da Serra, Nova Lima-MG, 34006-065', 'Nova Lima', 'Vila da Serra', -19.9756885, -43.9394271, 'restaurant', array['Buffet'], '$$', '(31) 3024-8104', 'https://www.instagram.com/vila21bh', 'ChIJfc67pH-ZpgARsBXmlENn6Mc', 'published'),
  ('40000000-0000-4000-8000-000000000005', 'dorival-bar-parrilla', 'Dorival Bar & Parrilla', 'Alameda Oscar Niemeyer, 841, Vila da Serra, Nova Lima-MG, 34006-065', 'Nova Lima', 'Vila da Serra', -19.9783507, -43.9425139, 'bar', array['Parrilla','Coquetéis'], '$$', '(31) 3643-4311', 'https://reservation-dionisio-crm.web.app/dorival-bar-e-parrilla', 'ChIJnRsLQQKYpgARppqjfv7oPAA', 'published'),
  ('40000000-0000-4000-8000-000000000006', 'via-sante-restaurante', 'Via Santé Restaurante', 'R. da Paisagem, 240, Vila da Serra, Nova Lima-MG, 34006-059', 'Nova Lima', 'Vila da Serra', -19.9815687, -43.9455749, 'restaurant', array[]::text[], '$$', '(31) 3286-5549', null, 'ChIJbcUsqf-XpgARr7Q4_vvZyVs', 'published'),
  ('40000000-0000-4000-8000-000000000007', 'vila-monjardim-costelaria', 'Vila Monjardim Costelaria', 'Alameda Oscar Niemeyer, 1033, Vila da Serra, Nova Lima-MG, 34006-065', 'Nova Lima', 'Vila da Serra', -19.976711, -43.940669, 'bar', array['Carnes','Brasileira'], '$$', '(31) 3566-2033', 'https://www.monjardimcostelaria.com.br/', 'ChIJ2XvSAgOYpgARfoTf5CNwvLw', 'published'),
  ('40000000-0000-4000-8000-000000000008', 'trailer-do-negao-vila-da-serra', 'Trailer do Negão - Vila da Serra', 'Alameda Oscar Niemeyer, 380, Vila da Serra, Nova Lima-MG, 34006-056', 'Nova Lima', 'Vila da Serra', -19.9815093, -43.9440622, 'restaurant', array[]::text[], '$$', '(31) 98716-9240', 'https://instagram.com/trailerdonegao', 'ChIJpTE96hGXpgARc_yobntL8BA', 'published'),
  ('40000000-0000-4000-8000-000000000009', 'kei-cozinha-japonesa-vila-da-serra', 'Kei Cozinha Japonesa - Vila da Serra', 'Alameda Oscar Niemeyer, 891, Vila da Serra, Nova Lima-MG, 34000-000', 'Nova Lima', 'Vila da Serra', -19.9782102, -43.942427, 'restaurant', array['Japonesa'], '$$$', '(31) 2581-2525', 'https://www.keiviladaserra.com.br/', 'ChIJs1ovbqGZpgARvbk3Il_5FmI', 'published'),
  ('40000000-0000-4000-8000-000000000010', 'faz-de-conta', 'Faz de Conta', 'Av. Toronto, 1465, Jardim Canadá, Nova Lima-MG, 34010-552', 'Nova Lima', 'Jardim Canadá', -20.0717611, -43.9837479, 'restaurant', array['Brasileira'], '$$', '(31) 97314-0888', 'https://www.instagram.com/restaurantefazdeconta/', 'ChIJCSlteBW9pgARIssTa1I5wtk', 'published')
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
  if exists (
    select 1 from public.restaurants
    where id::text like '10000000-0000-4000-8000-%'
  ) then
    raise exception 'Development seed restaurants remain after cleanup';
  end if;

  if (
    select count(*) from public.restaurants
    where id::text like '40000000-0000-4000-8000-%'
      and google_place_id is not null
  ) <> 10 then
    raise exception 'Expected 10 curated Nova Lima restaurants after import';
  end if;
end;
$$;
