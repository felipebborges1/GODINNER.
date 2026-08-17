-- GODINNER Beta 0.1: first curated real-restaurant catalog.
-- Public business data was checked against official restaurant pages, public
-- tourism directories and the user-provided research. No ratings, reviews,
-- average spend or restaurant-specific photos are fabricated by this import.

insert into public.restaurants (
  id, slug, name, address, city, neighborhood, latitude, longitude,
  category, cuisines, price_range, phone, website, chef, status
)
values
  ('30000000-0000-4000-8000-000000000001', 'a-forja-taverna', 'A Forja Taverna', 'R. Cláudio Manoel, 500, Funcionários, Belo Horizonte-MG, 30140-105', 'Belo Horizonte', 'Funcionários', -19.9341875, -43.9298125, 'bar', array['Internacional','Europeia','Pub'], '$$$', '(31) 98291-9595', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000002', 'a2-bistro', 'A2 Bistrô', 'R. Prof. Antônio Márcio, 445, Palmares, Belo Horizonte-MG, 31155-480', 'Belo Horizonte', 'Palmares', -19.8705625, -43.9340625, 'restaurant', array['Contemporânea','Europeia'], '$$$', '(31) 98633-3333', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000003', 'aje-bistro-bar', 'Ajê Bistrô Bar', 'R. Dores do Indaiá, 96, Santa Tereza, Belo Horizonte-MG, 31010-360', 'Belo Horizonte', 'Santa Tereza', -19.9170625, -43.9130625, 'restaurant', array['Francesa','Internacional'], '$$$', '(31) 97129-0664', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000004', 'buffet-bhagwan', 'Buffet Bhagwan', 'R. Conselheiro Lafaiete, 771, Sagrada Família, Belo Horizonte-MG, 31030-010', 'Belo Horizonte', 'Sagrada Família', -19.9053416, -43.9242607, 'restaurant', array['Indiana'], '$$', '(31) 3653-3000', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000005', 'caravela', 'Caravela', 'Av. Olegário Maciel, 1600, 3º piso, DiamondMall, Santo Agostinho, Belo Horizonte-MG', 'Belo Horizonte', 'Santo Agostinho', -19.9279375, -43.9474375, 'restaurant', array['Portuguesa'], '$$$$', '(31) 99585-5804', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000006', 'dartagnan', 'D’Artagnan', 'R. Tomás Gonzaga, 593, Lourdes, Belo Horizonte-MG, 30180-143', 'Belo Horizonte', 'Lourdes', -19.9321875, -43.9446875, 'restaurant', array['Francesa','Internacional','Mediterrânea','Contemporânea'], '$$$$', '(31) 3295-7878', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000007', 'dorian-cacao-venezuela', 'Dorian Cacao Venezuela', 'R. Silva Jardim, 158, Floresta, Belo Horizonte-MG, 30150-010', 'Belo Horizonte', 'Floresta', -19.9150625, -43.9293125, 'restaurant', array['Venezuelana'], '$$', '(31) 98266-5427', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000008', 'gumbo-soulfood', 'Gumbo Soulfood', 'Av. Amazonas, 1049, loja 75, Centro, Belo Horizonte-MG, 30180-000', 'Belo Horizonte', 'Centro', -19.9223125, -43.9439375, 'restaurant', array['Cajun','Creole','Brasileira'], '$$', null, null, '', 'published'),
  ('30000000-0000-4000-8000-000000000009', 'indian-gourmet', 'Indian Gourmet', 'R. Alvarenga Peixoto, 585, Lourdes, Belo Horizonte-MG, 30180-124', 'Belo Horizonte', 'Lourdes', -19.9309375, -43.9440625, 'restaurant', array['Indiana','Chinesa'], '$$$', '(31) 2555-9005', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000010', 'inka-peruano-e-japones', 'Inka Peruano e Japonês', 'R. Guaicuí, 533, Luxemburgo, Belo Horizonte-MG, 30380-342', 'Belo Horizonte', 'Luxemburgo', -19.9471875, -43.9535625, 'restaurant', array['Peruana','Japonesa','Frutos do Mar','Sushi'], '$$$', '(31) 3293-1461', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000011', 'lygia-brasa-bistro', 'Lygia Brasa Bistrô', 'R. Juvenal de Melo Senra, 385, Belvedere, Belo Horizonte-MG, 30320-660', 'Belo Horizonte', 'Belvedere', -19.9739375, -43.9419375, 'restaurant', array['Mediterrânea','Espanhola','Portuguesa'], '$$$', '(31) 99885-1178', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000012', 'massala-savassi', 'Massala Savassi', 'R. dos Inconfidentes, 871, Savassi, Belo Horizonte-MG, 30140-128', 'Belo Horizonte', 'Savassi', -19.9360625, -43.9340625, 'restaurant', array['Indiana'], '$$', '(31) 3658-9088', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000013', 'mitra-restaurante', 'Mitra Restaurante', 'Rodovia BR-356, 7515, loja LJ, Belvedere, Belo Horizonte-MG, 30390-003', 'Belo Horizonte', 'Belvedere', -19.9911875, -43.9571875, 'restaurant', array['Mediterrânea'], '$$$$', '(31) 99867-7570', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000014', 'morada-mexicana', 'Morada Mexicana', 'R. Antônio de Albuquerque, 369, Savassi, Belo Horizonte-MG, 30112-010', 'Belo Horizonte', 'Savassi', -19.9385625, -43.9341875, 'restaurant', array['Mexicana','Sul-Americana'], '$$', '(31) 3646-2969', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000015', 'namaste', 'Namastê', 'Av. Francisco Sá, 440, Prado, Belo Horizonte-MG, 30410-060', 'Belo Horizonte', 'Prado', -19.9266875, -43.9596875, 'restaurant', array['Indiana'], '$$', '(31) 3567-5200', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000016', 'neckartal', 'Neckartal', 'R. Leopoldina, 73, Santo Antônio, Belo Horizonte-MG, 30330-230', 'Belo Horizonte', 'Santo Antônio', -19.9404375, -43.9401875, 'restaurant', array['Alemã'], '$$', '(31) 3296-8750', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000017', 'paladar-do-cubano', 'Paladar do Cubano', 'R. Conde de Linhares, 926A, Coração de Jesus, Belo Horizonte-MG, 30380-262', 'Belo Horizonte', 'Coração de Jesus', -19.9440625, -43.9495625, 'restaurant', array['Cubana','Caribenha','Latino-Americana'], '$$', '(31) 99266-0354', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000018', 'taberna-baltazar', 'Taberna Baltazar', 'R. Oriente, 571, Serra, Belo Horizonte-MG, 30220-270', 'Belo Horizonte', 'Serra', -19.9426875, -43.9184375, 'bar', array['Portuguesa','Europeia'], '$$$', '(31) 97145-7597', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000019', 'taste-vin', 'Taste-Vin', 'R. Curitiba, 2105, Lourdes, Belo Horizonte-MG, 30170-127', 'Belo Horizonte', 'Lourdes', -19.9311875, -43.9445625, 'restaurant', array['Francesa','Europeia'], '$$$$', '(31) 3292-5423', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000020', 'zaika-tandoor', 'Zaika Tandoor', 'R. Oriente, 246, Serra, Belo Horizonte-MG, 30220-270', 'Belo Horizonte', 'Serra', -19.9398125, -43.9178125, 'restaurant', array['Indiana','Vegetariana'], '$$', '(31) 3017-3076', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000021', 'olegario-vila-da-serra', 'Olegário Vila da Serra', 'Alameda Oscar Niemeyer, 405, Vila da Serra, Nova Lima-MG, 34006-056', 'Nova Lima', 'Vila da Serra', -19.9798459, -43.9433845, 'restaurant', array['Italiana','Pizza'], '$$$', '(31) 3566-4122', 'https://www.pizzariaolegario.com.br/', '', 'published'),
  ('30000000-0000-4000-8000-000000000022', 'almanaque-vila-da-serra', 'Almanaque Vila da Serra', 'Alameda Oscar Niemeyer, 1369, lojas 51 e 53, Vila da Serra, Nova Lima-MG, 34006-065', 'Nova Lima', 'Vila da Serra', -19.9791950, -43.9430723, 'bar', array['Brasileira','Contemporânea'], '$$$', '(31) 3567-1415', 'https://www.choperiaalmanaque.com.br/vila-da-serra/', '', 'published'),
  ('30000000-0000-4000-8000-000000000023', 'alameda-288', 'Alameda 288', 'Alameda Oscar Niemeyer, 288, Vale do Sereno, Nova Lima-MG, 34006-056', 'Nova Lima', 'Vale do Sereno', -19.9835058, -43.9464391, 'restaurant', array['Brasileira','Buffet','Churrasco','Pizza'], '$$', '(31) 3347-7789', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000024', 'bar-do-lopes-vila-da-serra', 'Bar do Lopes Vila da Serra', 'Rodovia Januário Carneiro, 20, Vila da Serra, Nova Lima-MG', 'Nova Lima', 'Vila da Serra', -19.9829000, -43.9470000, 'bar', array['Brasileira','Boteco'], '$$', null, 'https://linktr.ee/bardolopeslayback', '', 'published'),
  ('30000000-0000-4000-8000-000000000025', 'ah-bon-bistrot-vila-da-serra', 'Ah! Bon Bistrot Vila da Serra', 'Alameda Oscar Niemeyer, 1033, loja 10, Vila da Serra, Nova Lima-MG, 34006-065', 'Nova Lima', 'Vila da Serra', -19.9754783, -43.9390968, 'restaurant', array['Contemporânea','Café'], '$$$', '(31) 3653-2438', 'https://www.ahbon.com.br/', '', 'published'),
  ('30000000-0000-4000-8000-000000000026', 'olivia-mediterraneo', 'Olivia Mediterrâneo', 'Alameda Oscar Niemeyer, 1033, loja 18, Vila da Serra, Nova Lima-MG, 34006-065', 'Nova Lima', 'Vila da Serra', -19.9755500, -43.9390000, 'restaurant', array['Mediterrânea'], '$$$', '(31) 99556-0952', null, '', 'published'),
  ('30000000-0000-4000-8000-000000000027', 'la-macelleria-vila-da-serra', 'La Macelleria Vila da Serra', 'Alameda Oscar Niemeyer, 1021, loja 06, Vila da Serra, Nova Lima-MG, 34006-065', 'Nova Lima', 'Vila da Serra', -19.9785609, -43.9424073, 'restaurant', array['Carnes','Parrilla'], '$$$', '(31) 3370-9595', 'https://www.lamacelleria.com.br/', '', 'published'),
  ('30000000-0000-4000-8000-000000000028', 'pobre-juan-bh-shopping', 'Pobre Juan BH Shopping', 'Rodovia BR-356, 3049, loja 61, piso Mariana, BH Shopping, Belvedere, Belo Horizonte-MG, 30320-900', 'Belo Horizonte', 'Belvedere', -19.9950413, -43.9603500, 'restaurant', array['Argentina','Carnes','Parrilla'], '$$$$', '(31) 2551-8067', 'https://pobrejuan.com.br/', '', 'published'),
  ('30000000-0000-4000-8000-000000000029', 'glouton', 'Glouton', 'R. Bárbara Heliodora, 59, Lourdes, Belo Horizonte-MG, 30180-130', 'Belo Horizonte', 'Lourdes', -19.9314906, -43.9441206, 'restaurant', array['Mineira','Brasileira','Contemporânea','Francesa'], '$$$$', '(31) 3292-4237', 'https://www.grupoglouton.com.br/', 'Léo Paixão', 'published'),
  ('30000000-0000-4000-8000-000000000030', 'ninita', 'Ninita', 'R. Bárbara Heliodora, 71, Lourdes, Belo Horizonte-MG, 30180-130', 'Belo Horizonte', 'Lourdes', -19.9314300, -43.9440800, 'restaurant', array['Italiana','Brasileira'], '$$$$', '(31) 3292-4237', 'https://www.grupoglouton.com.br/', 'Léo Paixão', 'published')
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
  chef = excluded.chef,
  status = 'published';

do $$
begin
  if (
    select count(*) from public.restaurants
    where id::text like '30000000-0000-4000-8000-%'
  ) <> 30 then
    raise exception 'Expected 30 curated Beta restaurants after import';
  end if;
end;
$$;
