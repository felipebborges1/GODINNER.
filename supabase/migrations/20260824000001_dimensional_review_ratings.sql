-- Preserve historical 0-10 ratings as legacy records while new reviews use 1-5 dimensions.
alter table public.reviews
  add column if not exists food_rating integer,
  add column if not exists service_rating integer,
  add column if not exists ambience_rating integer,
  add column if not exists rating_method text;

update public.reviews
set rating_method = 'legacy'
where rating_method is null;

alter table public.reviews
  alter column rating drop not null,
  alter column rating_method set default 'legacy',
  alter column rating_method set not null;

alter table public.reviews
  drop constraint if exists reviews_rating_method_check,
  drop constraint if exists reviews_food_rating_range_check,
  drop constraint if exists reviews_service_rating_range_check,
  drop constraint if exists reviews_ambience_rating_range_check,
  drop constraint if exists reviews_rating_shape_check,
  add constraint reviews_rating_method_check check (rating_method in ('legacy', 'dimensions')),
  add constraint reviews_food_rating_range_check check (food_rating is null or food_rating between 1 and 5),
  add constraint reviews_service_rating_range_check check (service_rating is null or service_rating between 1 and 5),
  add constraint reviews_ambience_rating_range_check check (ambience_rating is null or ambience_rating between 1 and 5),
  add constraint reviews_rating_shape_check check (
    (rating_method = 'legacy' and rating is not null and food_rating is null and service_rating is null and ambience_rating is null)
    or
    (rating_method = 'dimensions' and rating is null and food_rating is not null and service_rating is not null and ambience_rating is not null)
  );

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
  photo jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_food_rating is null or p_service_rating is null or p_ambience_rating is null or p_food_rating not between 1 and 5 or p_service_rating not between 1 and 5 or p_ambience_rating not between 1 and 5 then raise exception 'invalid_dimension_rating'; end if;
  if jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > 5 then raise exception 'maximum_five_photos'; end if;
  if not exists (select 1 from public.restaurants where id = p_restaurant_id and status <> 'rejected') then raise exception 'restaurant_unavailable'; end if;

  insert into public.reviews (user_id, restaurant_id, rating, rating_method, food_rating, service_rating, ambience_rating, comment, amount_per_person, visit_date)
  values (auth.uid(), p_restaurant_id, null, 'dimensions', p_food_rating, p_service_rating, p_ambience_rating, coalesce(p_comment, ''), p_amount_per_person, p_visit_date)
  returning id into review_id;

  for photo in select * from jsonb_array_elements(p_photos) loop
    insert into public.review_photos (review_id, storage_path, position)
    values (review_id, photo ->> 'storage_path', (photo ->> 'position')::smallint);
  end loop;

  insert into public.restaurant_list_items (list_id, restaurant_id)
  select id, p_restaurant_id from public.restaurant_lists where owner_id = auth.uid() and type = 'visited'
  on conflict do nothing;
  delete from public.restaurant_list_items where restaurant_id = p_restaurant_id and list_id in (select id from public.restaurant_lists where owner_id = auth.uid() and type = 'want');
  return review_id;
end;
$$;

revoke execute on function public.publish_review_dimensions(uuid, integer, integer, integer, text, numeric, date, jsonb) from public;
grant execute on function public.publish_review_dimensions(uuid, integer, integer, integer, text, numeric, date, jsonb) to authenticated;
