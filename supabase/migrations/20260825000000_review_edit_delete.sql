-- Reviews remain the social object. These RPCs keep content changes atomic and
-- return obsolete private Storage paths for explicit client-side cleanup.
drop policy if exists reviews_self_update on public.reviews;
drop policy if exists reviews_self_delete on public.reviews;
create policy reviews_owner_or_admin_update on public.reviews
for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
create policy reviews_owner_or_admin_delete on public.reviews
for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists review_photos_owner_manage on public.review_photos;
create policy review_photos_owner_or_admin_manage on public.review_photos
for all to authenticated
using (exists (select 1 from public.reviews review where review.id = review_id and (review.user_id = auth.uid() or public.is_admin())))
with check (exists (select 1 from public.reviews review where review.id = review_id and (review.user_id = auth.uid() or public.is_admin())));

drop policy if exists storage_review_photos_owner_or_admin_delete on storage.objects;
create policy storage_review_photos_owner_or_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'review-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

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

  select coalesce(array_agg(photo ->> 'storage_path'), '{}'::text[]) into requested_paths
  from jsonb_array_elements(p_photos) photo;
  if exists (
    select 1 from unnest(requested_paths) path
    where path is null or length(trim(path)) = 0
      or (path not like auth.uid()::text || '/%' and not exists (select 1 from public.review_photos existing where existing.review_id = target.id and existing.storage_path = path))
  ) then raise exception 'invalid_photo_path'; end if;

  select coalesce(array_agg(existing.storage_path), '{}'::text[]) into removed_paths
  from public.review_photos existing
  where existing.review_id = target.id and not (existing.storage_path = any(requested_paths));

  update public.reviews as review
  set rating = null, rating_method = 'dimensions', food_rating = p_food_rating, service_rating = p_service_rating,
      ambience_rating = p_ambience_rating, comment = trim(p_comment), amount_per_person = p_amount_per_person, visit_date = p_visit_date
  where review.id = target.id
  returning review.id, review.updated_at into review_id, updated_at;

  delete from public.review_photos where review_id = target.id;
  for photo in select * from jsonb_array_elements(p_photos) loop
    insert into public.review_photos (review_id, storage_path, position)
    values (target.id, photo ->> 'storage_path', (photo ->> 'position')::smallint);
  end loop;
  return next;
end;
$$;

create or replace function public.delete_review_owned(p_review_id uuid)
returns table(review_id uuid, removed_paths text[], visited_entry_removed boolean)
language plpgsql
security invoker
set search_path = public
as $$
declare
  target public.reviews%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into target from public.reviews review
  where review.id = p_review_id and (review.user_id = auth.uid() or public.is_admin())
  for update;
  if not found then raise exception 'review_not_found_or_forbidden' using errcode = '42501'; end if;

  select coalesce(array_agg(storage_path), '{}'::text[]) into removed_paths
  from public.review_photos where review_photos.review_id = target.id;
  delete from public.reviews where id = target.id;

  visited_entry_removed := false;
  if not exists (select 1 from public.reviews where user_id = target.user_id and restaurant_id = target.restaurant_id) then
    delete from public.restaurant_list_items item
    using public.restaurant_lists list
    where item.list_id = list.id and list.owner_id = target.user_id and list.type = 'visited' and item.restaurant_id = target.restaurant_id;
    visited_entry_removed := found;
  end if;
  review_id := target.id;
  return next;
end;
$$;

revoke execute on function public.update_review_owned(uuid, integer, integer, integer, text, numeric, date, jsonb) from public;
revoke execute on function public.delete_review_owned(uuid) from public;
grant execute on function public.update_review_owned(uuid, integer, integer, integer, text, numeric, date, jsonb) to authenticated;
grant execute on function public.delete_review_owned(uuid) to authenticated;
