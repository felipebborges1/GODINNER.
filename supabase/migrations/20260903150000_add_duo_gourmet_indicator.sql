-- The nullable flag distinguishes confirmed partners from explicit non-partners and unknown status.
alter table public.restaurants
  add column if not exists accepts_duo_gourmet boolean default null;

comment on column public.restaurants.accepts_duo_gourmet is
  'Duo Gourmet partner status: true confirmed, false explicit non-partner, null unknown.';

-- Beta MVP: only exact name, address and municipality matches from Duo Gourmet's public catalog are backfilled.
update public.restaurants
set accepts_duo_gourmet = true
where accepts_duo_gourmet is distinct from true
  and (
    (slug = 'akane-cozinha-japonesa-belvedere' and city = 'Belo Horizonte' and address ilike '%José Maria Alkimin, 86%')
    or (slug = 'restaurante-benvindo-lourdes' and city = 'Belo Horizonte' and address ilike '%Espírito Santo, 2488%')
    or (slug = 'kei-cozinha-japonesa-vila-da-serra' and city = 'Nova Lima' and address ilike '%Oscar Niemeyer, 891%')
    or (slug = 'valle-gastronomico' and city = 'Belo Horizonte' and address ilike '%Santa Rita, 221%')
  );
