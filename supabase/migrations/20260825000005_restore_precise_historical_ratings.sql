-- Restore exact half-scale values recorded immediately before the one-time conversion.
alter table public.reviews disable trigger reviews_set_updated_at;

update public.reviews
set rating = case id
  when '88574e9c-73df-4d17-9b4e-8e4c2eed6fea'::uuid then 4.150
  when '39c185ac-b8a2-409d-a97f-911344e9cefc'::uuid then 4.500
  when 'd318bd5c-46ab-490e-9727-b7bab93af36c'::uuid then 4.550
  when '67a16e4a-0add-4504-a3b5-2e1630baac4c'::uuid then 3.950
  when 'f4b45477-f8b2-40c5-ba41-97bcf222bbd4'::uuid then 4.400
  else rating
end
where id in (
  '88574e9c-73df-4d17-9b4e-8e4c2eed6fea'::uuid,
  '39c185ac-b8a2-409d-a97f-911344e9cefc'::uuid,
  'd318bd5c-46ab-490e-9727-b7bab93af36c'::uuid,
  '67a16e4a-0add-4504-a3b5-2e1630baac4c'::uuid,
  'f4b45477-f8b2-40c5-ba41-97bcf222bbd4'::uuid
) and rating_method = 'legacy';

alter table public.reviews enable trigger reviews_set_updated_at;
