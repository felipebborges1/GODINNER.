-- Development-only seed. No real credentials are stored here.
insert into auth.users (id, email, raw_user_meta_data, aud, role, email_confirmed_at)
values
  ('00000000-0000-4000-8000-000000000001', 'bia@example.local', '{"username":"bia.fonseca","name":"Bia Fonseca","location":"Vila da Serra"}', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-8000-000000000002', 'caio@example.local', '{"username":"caio.mattos","name":"Caio Mattos","location":"Belvedere"}', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-8000-000000000003', 'luma@example.local', '{"username":"luma.freire","name":"Luma Freire","location":"Vale do Sereno"}', 'authenticated', 'authenticated', now())
on conflict (id) do nothing;

update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000001';

insert into public.restaurants (id, slug, name, address, city, neighborhood, latitude, longitude, category, cuisines, price_range, chef, status)
values
  ('10000000-0000-4000-8000-000000000001', 'cozinha-do-sereno', 'Cozinha do Sereno', 'Endereço ilustrativo, 10', 'Nova Lima', 'Vila da Serra', -19.98, -43.95, 'restaurant', array['Contemporânea'], '$$$', 'Ana', 'published'),
  ('10000000-0000-4000-8000-000000000002', 'forno-da-alameda', 'Forno da Alameda', 'Alameda Oscar Niemeyer, 20', 'Belo Horizonte', 'Belvedere', -19.95, -43.95, 'restaurant', array['Italiana'], '$$', '', 'published'),
  ('10000000-0000-4000-8000-000000000003', 'bar-da-mata', 'Bar da Mata', 'Rua da Mata, 30', 'Nova Lima', 'Vale do Sereno', -19.97, -43.94, 'bar', array['Brasileira'], '$$', '', 'published'),
  ('10000000-0000-4000-8000-000000000004', 'nori-vila', 'Nori Vila', 'Rua das Flores, 40', 'Nova Lima', 'Vila da Serra', -19.976, -43.95, 'restaurant', array['Japonesa'], '$$$', '', 'published'),
  ('10000000-0000-4000-8000-000000000005', 'cadastro-pendente-local', 'Cadastro Pendente Local', 'Rua do Teste, 50', 'Belo Horizonte', 'Belvedere', -19.94, -43.94, 'restaurant', array['Contemporânea'], '$$', '', 'pending_review')
on conflict (id) do nothing;

insert into public.reviews (id, user_id, restaurant_id, rating, comment, amount_per_person, visit_date)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 8.8, 'Ambiente acolhedor e cozinha precisa.', 120, current_date - 10),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 8.1, 'Boa experiência para ir sem pressa.', 100, current_date - 5),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 8.6, 'Massas e forno muito bem executados.', 90, current_date - 4)
on conflict (id) do nothing;

insert into public.restaurant_list_items (list_id, restaurant_id)
select l.id, '10000000-0000-4000-8000-000000000001' from public.restaurant_lists l where l.owner_id = '00000000-0000-4000-8000-000000000001' and l.type = 'visited'
on conflict do nothing;

insert into public.follows (follower_id, following_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002')
on conflict do nothing;
