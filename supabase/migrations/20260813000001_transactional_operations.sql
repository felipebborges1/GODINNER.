create or replace function public.publish_review(
  p_restaurant_id uuid,
  p_rating numeric,
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
  if jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > 5 then raise exception 'maximum_five_photos'; end if;
  if not exists (select 1 from public.restaurants where id = p_restaurant_id and status <> 'rejected') then raise exception 'restaurant_unavailable'; end if;
  insert into public.reviews (user_id, restaurant_id, rating, comment, amount_per_person, visit_date)
  values (auth.uid(), p_restaurant_id, p_rating, coalesce(p_comment, ''), p_amount_per_person, p_visit_date)
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

create or replace function public.merge_restaurant(p_pending_id uuid, p_target_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_pending_id = p_target_id or not exists (select 1 from public.restaurants where id = p_pending_id and status = 'pending_review') or not exists (select 1 from public.restaurants where id = p_target_id and status = 'published') then raise exception 'invalid_merge'; end if;
  update public.reviews set restaurant_id = p_target_id where restaurant_id = p_pending_id;
  insert into public.restaurant_list_items (list_id, restaurant_id)
  select list_id, p_target_id from public.restaurant_list_items where restaurant_id = p_pending_id
  on conflict do nothing;
  delete from public.restaurant_list_items where restaurant_id = p_pending_id;
  update public.restaurants set status = 'rejected', rejection_reason = 'duplicate', merged_into_id = p_target_id, moderated_by = auth.uid(), moderated_at = timezone('utc', now()) where id = p_pending_id;
  return p_target_id;
end;
$$;

revoke execute on function public.publish_review(uuid, numeric, text, numeric, date, jsonb) from public;
grant execute on function public.publish_review(uuid, numeric, text, numeric, date, jsonb) to authenticated;
revoke execute on function public.merge_restaurant(uuid, uuid) from public;
grant execute on function public.merge_restaurant(uuid, uuid) to authenticated;
