-- The first Recommendations unlock is a historical user milestone, not a
-- derived UI count. Keeping it on profiles prevents repeat celebrations after
-- reloads, sessions, devices, review edits, or a later delete/recreate cycle.
alter table public.profiles
  add column if not exists recommendations_unlocked_at timestamptz,
  add column if not exists recommendations_unlock_seen_at timestamptz,
  add column if not exists recommendations_unlock_review_id uuid references public.reviews(id) on delete set null;

-- A client retry keeps the same publication key, so it cannot create a second
-- review or a second unlock event when the first response was interrupted.
alter table public.reviews
  add column if not exists publication_key uuid;
create unique index if not exists reviews_publication_key_owner_idx
  on public.reviews(user_id, publication_key)
  where publication_key is not null;

create or replace function public.publish_review_with_recommendation_unlock(
  p_restaurant_id uuid,
  p_food_rating integer,
  p_service_rating integer,
  p_ambience_rating integer,
  p_comment text,
  p_amount_per_person numeric,
  p_visit_date date,
  p_photos jsonb default '[]'::jsonb,
  p_publication_key uuid default null
)
returns table(review_id uuid, recommendations_unlocked boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_review_id uuid;
  photo_entry jsonb;
  review_currency text;
  valid_review_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_food_rating is null or p_service_rating is null or p_ambience_rating is null
    or p_food_rating not between 1 and 5 or p_service_rating not between 1 and 5 or p_ambience_rating not between 1 and 5 then
    raise exception 'invalid_dimension_rating';
  end if;
  if jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > 5 then raise exception 'maximum_five_photos'; end if;

  -- Match R1's definition of a valid recommendation score before inserting.
  select count(*) into valid_review_count
  from public.reviews
  where user_id = auth.uid() and rating between 0 and 5;

  select public.currency_for_country(country_code) into review_currency
  from public.restaurants
  where id = p_restaurant_id and status <> 'rejected';
  if not found then raise exception 'restaurant_unavailable'; end if;

  insert into public.reviews (user_id, restaurant_id, rating, rating_method, food_rating, service_rating, ambience_rating, comment, amount_per_person, currency, visit_date, publication_key)
  values (auth.uid(), p_restaurant_id, (p_food_rating + p_service_rating + p_ambience_rating)::numeric / 3, 'dimensions', p_food_rating, p_service_rating, p_ambience_rating, coalesce(p_comment, ''), p_amount_per_person, review_currency, p_visit_date, p_publication_key)
  on conflict (user_id, publication_key) where publication_key is not null do nothing
  returning id into inserted_review_id;

  if inserted_review_id is null and p_publication_key is not null then
    select id into review_id from public.reviews
    where user_id = auth.uid() and publication_key = p_publication_key;
    select recommendations_unlock_review_id = review_id into recommendations_unlocked
    from public.profiles where id = auth.uid();
    return next;
    return;
  end if;

  review_id := inserted_review_id;
  for photo_entry in select * from jsonb_array_elements(p_photos) loop
    insert into public.review_photos (review_id, storage_path, position)
    values (review_id, photo_entry ->> 'storage_path', (photo_entry ->> 'position')::smallint);
  end loop;

  insert into public.restaurant_list_items (list_id, restaurant_id)
  select id, p_restaurant_id from public.restaurant_lists where owner_id = auth.uid() and type = 'visited'
  on conflict do nothing;
  delete from public.restaurant_list_items where restaurant_id = p_restaurant_id and list_id in (select id from public.restaurant_lists where owner_id = auth.uid() and type = 'want');

  recommendations_unlocked := false;
  if valid_review_count = 2 then
    update public.profiles
    set recommendations_unlocked_at = timezone('utc', now()), recommendations_unlock_review_id = review_id
    where id = auth.uid() and recommendations_unlocked_at is null;
    recommendations_unlocked := found;
  end if;
  return next;
end;
$$;

create or replace function public.claim_recommendation_unlock_modal()
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.profiles
  set recommendations_unlock_seen_at = timezone('utc', now())
  where id = auth.uid()
    and recommendations_unlocked_at is not null
    and recommendations_unlock_seen_at is null;
  return found;
end;
$$;

revoke execute on function public.publish_review_with_recommendation_unlock(uuid, integer, integer, integer, text, numeric, date, jsonb, uuid) from public;
grant execute on function public.publish_review_with_recommendation_unlock(uuid, integer, integer, integer, text, numeric, date, jsonb, uuid) to authenticated;
revoke execute on function public.claim_recommendation_unlock_modal() from public;
grant execute on function public.claim_recommendation_unlock_modal() to authenticated;
