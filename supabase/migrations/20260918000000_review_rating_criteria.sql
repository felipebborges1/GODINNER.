-- Optional per-topic review criteria. Existing reviews remain general ratings;
-- no historical score is recalculated or populated by this migration.
alter table public.reviews
  add column if not exists rating_details jsonb;

alter table public.reviews
  alter column food_rating type numeric(5,3) using food_rating::numeric(5,3),
  alter column service_rating type numeric(5,3) using service_rating::numeric(5,3),
  alter column ambience_rating type numeric(5,3) using ambience_rating::numeric(5,3);

create or replace function public.review_topic_score_from_details(p_details jsonb, p_topic text)
returns numeric language plpgsql immutable set search_path = public as $$
declare topic jsonb; criteria jsonb; mode text; general_score numeric; criteria_score numeric; criteria_count integer; allowed_keys text[];
begin
  if jsonb_typeof(p_details) <> 'object' or p_details ->> 'version' <> '1' then raise exception 'invalid_rating_details_version'; end if;
  topic := p_details -> p_topic;
  if jsonb_typeof(topic) <> 'object' then raise exception 'invalid_rating_details_topic'; end if;
  mode := topic ->> 'mode';
  if mode not in ('general', 'criteria') then raise exception 'invalid_rating_details_mode'; end if;
  criteria := coalesce(topic -> 'criteria', '{}'::jsonb);
  if jsonb_typeof(criteria) <> 'object' then raise exception 'invalid_rating_details_criteria'; end if;
  allowed_keys := case p_topic when 'food' then array['taste', 'texture', 'temperature', 'presentation'] when 'ambience' then array['comfort', 'cleanliness', 'sound', 'atmosphere'] when 'service' then array['courtesy', 'attention', 'speed', 'order_accuracy'] else array[]::text[] end;
  if not p_topic = any(array['food', 'ambience', 'service']) or exists (select 1 from jsonb_object_keys(criteria) key where not key = any(allowed_keys)) then raise exception 'unknown_rating_criterion'; end if;
  if exists (select 1 from jsonb_each(criteria) item where jsonb_typeof(item.value) not in ('number', 'null') or (jsonb_typeof(item.value) = 'number' and ((item.value #>> '{}') !~ '^[1-5]$'))) then raise exception 'invalid_rating_criterion_value'; end if;
  if mode = 'general' then
    if jsonb_typeof(topic -> 'generalRating') <> 'number' or (topic ->> 'generalRating') !~ '^[1-5]$' then raise exception 'invalid_general_rating'; end if;
    general_score := (topic ->> 'generalRating')::numeric;
    return general_score;
  end if;
  select avg((item.value #>> '{}')::numeric), count(*) into criteria_score, criteria_count from jsonb_each(criteria) item where jsonb_typeof(item.value) = 'number';
  if criteria_count = 0 then raise exception 'rating_criteria_required'; end if;
  return criteria_score;
end;
$$;

create or replace function public.publish_review_with_rating_details(
  p_restaurant_id uuid, p_rating_details jsonb, p_comment text, p_amount_per_person numeric, p_visit_date date, p_photos jsonb default '[]'::jsonb, p_publication_key uuid default null
)
returns table(review_id uuid, recommendations_unlocked boolean)
language plpgsql security invoker set search_path = public as $$
declare inserted_review_id uuid; photo_entry jsonb; review_currency text; valid_review_count integer; food_score numeric; ambience_score numeric; service_score numeric;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > 5 then raise exception 'maximum_five_photos'; end if;
  food_score := public.review_topic_score_from_details(p_rating_details, 'food');
  ambience_score := public.review_topic_score_from_details(p_rating_details, 'ambience');
  service_score := public.review_topic_score_from_details(p_rating_details, 'service');
  select count(*) into valid_review_count from public.reviews where user_id = auth.uid() and rating between 0 and 5;
  select public.currency_for_country(country_code) into review_currency from public.restaurants where id = p_restaurant_id and status <> 'rejected';
  if not found then raise exception 'restaurant_unavailable'; end if;
  insert into public.reviews (user_id, restaurant_id, rating, rating_method, food_rating, service_rating, ambience_rating, rating_details, comment, amount_per_person, currency, visit_date, publication_key)
  values (auth.uid(), p_restaurant_id, (food_score + ambience_score + service_score) / 3, 'dimensions', food_score, service_score, ambience_score, p_rating_details, coalesce(p_comment, ''), p_amount_per_person, review_currency, p_visit_date, p_publication_key)
  on conflict (user_id, publication_key) where publication_key is not null do nothing returning id into inserted_review_id;
  if inserted_review_id is null and p_publication_key is not null then
    select id into review_id from public.reviews where user_id = auth.uid() and publication_key = p_publication_key;
    select recommendations_unlock_review_id = review_id into recommendations_unlocked from public.profiles where id = auth.uid();
    return next; return;
  end if;
  review_id := inserted_review_id;
  for photo_entry in select * from jsonb_array_elements(p_photos) loop insert into public.review_photos (review_id, storage_path, position) values (review_id, photo_entry ->> 'storage_path', (photo_entry ->> 'position')::smallint); end loop;
  insert into public.restaurant_list_items (list_id, restaurant_id) select id, p_restaurant_id from public.restaurant_lists where owner_id = auth.uid() and type = 'visited' on conflict do nothing;
  delete from public.restaurant_list_items where restaurant_id = p_restaurant_id and list_id in (select id from public.restaurant_lists where owner_id = auth.uid() and type = 'want');
  recommendations_unlocked := false;
  if valid_review_count = 2 then update public.profiles set recommendations_unlocked_at = timezone('utc', now()), recommendations_unlock_review_id = review_id where id = auth.uid() and recommendations_unlocked_at is null; recommendations_unlocked := found; end if;
  return next;
end;
$$;

create or replace function public.update_review_with_rating_details_owned(
  p_review_id uuid, p_rating_details jsonb, p_comment text, p_amount_per_person numeric, p_visit_date date, p_photos jsonb default '[]'::jsonb
)
returns table(review_id uuid, updated_at timestamptz, removed_paths text[])
language plpgsql security invoker set search_path = public as $$
declare target public.reviews%rowtype; requested_paths text[]; photo_entry jsonb; food_score numeric; ambience_score numeric; service_score numeric;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if length(trim(coalesce(p_comment, ''))) = 0 then raise exception 'comment_required'; end if;
  if p_visit_date > current_date then raise exception 'future_visit_date'; end if;
  if p_amount_per_person is not null and p_amount_per_person < 0 then raise exception 'invalid_amount'; end if;
  if jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > 5 then raise exception 'maximum_five_photos'; end if;
  food_score := public.review_topic_score_from_details(p_rating_details, 'food');
  ambience_score := public.review_topic_score_from_details(p_rating_details, 'ambience');
  service_score := public.review_topic_score_from_details(p_rating_details, 'service');
  select * into target from public.reviews review where review.id = p_review_id and (review.user_id = auth.uid() or public.is_admin()) for update;
  if not found then raise exception 'review_not_found_or_forbidden' using errcode = '42501'; end if;
  select coalesce(array_agg(requested_photo ->> 'storage_path'), '{}'::text[]) into requested_paths from jsonb_array_elements(p_photos) requested_photo;
  if exists (select 1 from unnest(requested_paths) path where path is null or length(trim(path)) = 0 or (path not like auth.uid()::text || '/%' and not exists (select 1 from public.review_photos existing where existing.review_id = target.id and existing.storage_path = path))) then raise exception 'invalid_photo_path'; end if;
  select coalesce(array_agg(existing.storage_path), '{}'::text[]) into removed_paths from public.review_photos existing where existing.review_id = target.id and not (existing.storage_path = any(requested_paths));
  update public.reviews as review set rating = (food_score + ambience_score + service_score) / 3, rating_method = 'dimensions', food_rating = food_score, service_rating = service_score, ambience_rating = ambience_score, rating_details = p_rating_details, comment = trim(p_comment), amount_per_person = p_amount_per_person, visit_date = p_visit_date where review.id = target.id returning review.id, review.updated_at into review_id, updated_at;
  delete from public.review_photos where review_photos.review_id = target.id;
  for photo_entry in select * from jsonb_array_elements(p_photos) loop insert into public.review_photos (review_id, storage_path, position) values (target.id, photo_entry ->> 'storage_path', (photo_entry ->> 'position')::smallint); end loop;
  return next;
end;
$$;

revoke execute on function public.publish_review_with_rating_details(uuid, jsonb, text, numeric, date, jsonb, uuid) from public;
grant execute on function public.publish_review_with_rating_details(uuid, jsonb, text, numeric, date, jsonb, uuid) to authenticated;
revoke execute on function public.update_review_with_rating_details_owned(uuid, jsonb, text, numeric, date, jsonb) from public;
grant execute on function public.update_review_with_rating_details_owned(uuid, jsonb, text, numeric, date, jsonb) to authenticated;
