-- Countries live on restaurants; review spend retains the currency used at visit time.
alter table public.restaurants add column if not exists country_code text;
alter table public.reviews add column if not exists currency text;

alter table public.restaurants
  drop constraint if exists restaurants_country_code_format_check,
  add constraint restaurants_country_code_format_check check (
    country_code is null or (country_code = upper(country_code) and country_code ~ '^[A-Z]{2}$')
  );

alter table public.reviews
  drop constraint if exists reviews_currency_format_check,
  add constraint reviews_currency_format_check check (
    currency is null or (currency = upper(currency) and currency ~ '^[A-Z]{3}$')
  );

create or replace function public.currency_for_country(p_country_code text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select case upper(p_country_code)
    when 'BR' then 'BRL'
    when 'ES' then 'EUR'
    when 'NL' then 'EUR'
    when 'PT' then 'EUR'
    when 'FR' then 'EUR'
    when 'IT' then 'EUR'
    when 'US' then 'USD'
    when 'GB' then 'GBP'
    else null
  end;
$$;

-- One-time high-confidence backfill. It only uses explicit country evidence
-- in persisted addresses plus the unambiguous existing Beta cities.
alter table public.restaurants disable trigger restaurants_set_updated_at;

update public.restaurants
set country_code = case
  when address ~* '(Espanha|Spain)' then 'ES'
  when address ~* '(Países Baixos|Netherlands)' then 'NL'
  when address ~* '(Brasil|Brazil)' then 'BR'
  when address ~* '(Portugal)' then 'PT'
  when address ~* '(França|France)' then 'FR'
  when address ~* '(Itália|Italy)' then 'IT'
  when address ~* '(Estados Unidos|United States)' then 'US'
  when address ~* '(Reino Unido|United Kingdom)' then 'GB'
  when city in ('Belo Horizonte', 'Nova Lima') then 'BR'
  else null
end
where country_code is null
  and (
    address ~* '(Espanha|Spain|Países Baixos|Netherlands|Brasil|Brazil|Portugal|França|France|Itália|Italy|Estados Unidos|United States|Reino Unido|United Kingdom)'
    or city in ('Belo Horizonte', 'Nova Lima')
  );

alter table public.restaurants enable trigger restaurants_set_updated_at;

-- Do not update historical spend values or timestamps: currency is the only
-- field backfilled onto reviews with a known restaurant country.
alter table public.reviews disable trigger reviews_set_updated_at;

update public.reviews as review
set currency = public.currency_for_country(restaurant.country_code)
from public.restaurants as restaurant
where review.restaurant_id = restaurant.id
  and review.amount_per_person is not null
  and review.currency is null
  and public.currency_for_country(restaurant.country_code) is not null;

alter table public.reviews enable trigger reviews_set_updated_at;

-- New review currency is derived server-side from the restaurant, never from
-- the user's location or a client-provided value.
create or replace function public.publish_review_dimensions(
  p_restaurant_id uuid,
  p_food_rating integer,
  p_service_rating integer,
  p_ambience_rating integer,
  p_comment text,
  p_amount_per_person numeric,
  p_visit_date date,
  p_photos jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  review_id uuid;
  photo_entry jsonb;
  review_currency text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_food_rating is null or p_service_rating is null or p_ambience_rating is null
    or p_food_rating not between 1 and 5 or p_service_rating not between 1 and 5 or p_ambience_rating not between 1 and 5 then
    raise exception 'invalid_dimension_rating';
  end if;
  if jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > 5 then raise exception 'maximum_five_photos'; end if;

  select public.currency_for_country(country_code) into review_currency
  from public.restaurants
  where id = p_restaurant_id and status <> 'rejected';
  if not found then raise exception 'restaurant_unavailable'; end if;

  insert into public.reviews (user_id, restaurant_id, rating, rating_method, food_rating, service_rating, ambience_rating, comment, amount_per_person, currency, visit_date)
  values (auth.uid(), p_restaurant_id, (p_food_rating + p_service_rating + p_ambience_rating)::numeric / 3, 'dimensions', p_food_rating, p_service_rating, p_ambience_rating, coalesce(p_comment, ''), p_amount_per_person, review_currency, p_visit_date)
  returning id into review_id;

  for photo_entry in select * from jsonb_array_elements(p_photos) loop
    insert into public.review_photos (review_id, storage_path, position)
    values (review_id, photo_entry ->> 'storage_path', (photo_entry ->> 'position')::smallint);
  end loop;

  insert into public.restaurant_list_items (list_id, restaurant_id)
  select id, p_restaurant_id from public.restaurant_lists where owner_id = auth.uid() and type = 'visited'
  on conflict do nothing;
  delete from public.restaurant_list_items where restaurant_id = p_restaurant_id and list_id in (select id from public.restaurant_lists where owner_id = auth.uid() and type = 'want');
  return review_id;
end;
$$;
