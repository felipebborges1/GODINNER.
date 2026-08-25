-- Ratings are permanently stored on a single 0–5 scale. Legacy rows have no dimensions.
alter table public.reviews disable trigger reviews_set_updated_at;

update public.reviews
set rating = rating / 2
where rating_method = 'legacy' and rating > 5;

update public.reviews
set rating = (food_rating + service_rating + ambience_rating)::numeric / 3
where rating_method = 'dimensions' and rating is null;

alter table public.reviews enable trigger reviews_set_updated_at;

alter table public.reviews
  alter column rating type numeric(5,3) using rating::numeric(5,3),
  alter column rating set not null,
  drop constraint if exists reviews_rating_shape_check,
  drop constraint if exists reviews_rating_range_check,
  add constraint reviews_rating_range_check check (rating between 0 and 5),
  add constraint reviews_rating_shape_check check (
    (rating_method = 'legacy' and food_rating is null and service_rating is null and ambience_rating is null)
    or
    (rating_method = 'dimensions' and food_rating is not null and service_rating is not null and ambience_rating is not null)
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
  photo_entry jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_food_rating is null or p_service_rating is null or p_ambience_rating is null
    or p_food_rating not between 1 and 5 or p_service_rating not between 1 and 5 or p_ambience_rating not between 1 and 5 then
    raise exception 'invalid_dimension_rating';
  end if;
  if jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > 5 then raise exception 'maximum_five_photos'; end if;
  if not exists (select 1 from public.restaurants where id = p_restaurant_id and status <> 'rejected') then raise exception 'restaurant_unavailable'; end if;

  insert into public.reviews (user_id, restaurant_id, rating, rating_method, food_rating, service_rating, ambience_rating, comment, amount_per_person, visit_date)
  values (auth.uid(), p_restaurant_id, (p_food_rating + p_service_rating + p_ambience_rating)::numeric / 3, 'dimensions', p_food_rating, p_service_rating, p_ambience_rating, coalesce(p_comment, ''), p_amount_per_person, p_visit_date)
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

revoke execute on function public.publish_review(uuid, numeric, text, numeric, date, jsonb) from public, anon, authenticated;
