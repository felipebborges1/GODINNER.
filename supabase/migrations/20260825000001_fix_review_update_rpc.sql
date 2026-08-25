-- The initial edit migration used an output variable named review_id. Qualify
-- the photo column to avoid PL/pgSQL ambiguity during replacement of photos.
create or replace function public.update_review_owned(
  p_review_id uuid,
  p_food_rating integer,
  p_service_rating integer,
  p_ambience_rating integer,
  p_comment text,
  p_amount_per_person numeric,
  p_visit_date date,
  p_photos jsonb default '[]'::jsonb
)
returns table(review_id uuid, updated_at timestamptz, removed_paths text[])
language plpgsql
security invoker
set search_path = public
as $$
declare
  target public.reviews%rowtype;
  requested_paths text[];
  photo jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_food_rating is null or p_service_rating is null or p_ambience_rating is null
    or p_food_rating not between 1 and 5 or p_service_rating not between 1 and 5 or p_ambience_rating not between 1 and 5 then
    raise exception 'invalid_dimension_rating';
  end if;
  if length(trim(coalesce(p_comment, ''))) = 0 then raise exception 'comment_required'; end if;
  if p_visit_date > current_date then raise exception 'future_visit_date'; end if;
  if p_amount_per_person is not null and p_amount_per_person < 0 then raise exception 'invalid_amount'; end if;
  if jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > 5 then raise exception 'maximum_five_photos'; end if;

  select * into target from public.reviews review
  where review.id = p_review_id and (review.user_id = auth.uid() or public.is_admin())
  for update;
  if not found then raise exception 'review_not_found_or_forbidden' using errcode = '42501'; end if;
  select coalesce(array_agg(photo ->> 'storage_path'), '{}'::text[]) into requested_paths from jsonb_array_elements(p_photos) photo;
  if exists (select 1 from unnest(requested_paths) path where path is null or length(trim(path)) = 0 or (path not like auth.uid()::text || '/%' and not exists (select 1 from public.review_photos existing where existing.review_id = target.id and existing.storage_path = path))) then raise exception 'invalid_photo_path'; end if;
  select coalesce(array_agg(existing.storage_path), '{}'::text[]) into removed_paths from public.review_photos existing where existing.review_id = target.id and not (existing.storage_path = any(requested_paths));
  update public.reviews as review set rating = null, rating_method = 'dimensions', food_rating = p_food_rating, service_rating = p_service_rating, ambience_rating = p_ambience_rating, comment = trim(p_comment), amount_per_person = p_amount_per_person, visit_date = p_visit_date where review.id = target.id returning review.id, review.updated_at into review_id, updated_at;
  delete from public.review_photos where review_photos.review_id = target.id;
  for photo in select * from jsonb_array_elements(p_photos) loop
    insert into public.review_photos (review_id, storage_path, position) values (target.id, photo ->> 'storage_path', (photo ->> 'position')::smallint);
  end loop;
  return next;
end;
$$;
