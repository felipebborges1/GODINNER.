-- Keep the database acceptance rule aligned with the admin UI. The previous
-- regular expression escaped the hostname dots twice, rejecting valid URLs.
create or replace function public.set_restaurant_michelin_recognition(
  p_restaurant_id uuid,
  p_status text,
  p_stars smallint,
  p_edition_year integer,
  p_source_url text
) returns public.restaurants
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_restaurant public.restaurants;
  source_is_official boolean := p_source_url like 'https://guide.michelin.com/%'
    or p_source_url like 'https://%.guide.michelin.com/%';
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  if p_status not in ('unknown', 'verified_starred', 'verified_no_star', 'needs_revalidation') then raise exception 'invalid_michelin_status'; end if;
  if p_status = 'verified_starred' and (p_stars not between 1 and 3 or p_edition_year not between 1900 and 2100 or not source_is_official) then raise exception 'invalid_michelin_verification'; end if;
  if p_status = 'verified_no_star' and (p_stars is not null or p_edition_year not between 1900 and 2100 or not source_is_official) then raise exception 'invalid_michelin_verification'; end if;

  update public.restaurants set
    michelin_status = p_status,
    michelin_stars = case when p_status = 'verified_starred' then p_stars else null end,
    michelin_edition_year = case when p_status in ('verified_starred', 'verified_no_star') then p_edition_year else null end,
    michelin_source_url = case when p_status in ('verified_starred', 'verified_no_star') then p_source_url else null end,
    michelin_verified_at = case when p_status in ('verified_starred', 'verified_no_star') then timezone('utc', now()) else null end,
    michelin_verified_by = case when p_status in ('verified_starred', 'verified_no_star') then auth.uid() else null end
  where id = p_restaurant_id
  returning * into next_restaurant;
  if next_restaurant.id is null then raise exception 'restaurant_not_found'; end if;

  insert into public.restaurant_michelin_recognition_history (
    restaurant_id, michelin_status, michelin_stars, michelin_edition_year, michelin_source_url, verified_at, verified_by, changed_by
  ) values (
    next_restaurant.id, next_restaurant.michelin_status, next_restaurant.michelin_stars, next_restaurant.michelin_edition_year,
    next_restaurant.michelin_source_url, next_restaurant.michelin_verified_at, next_restaurant.michelin_verified_by, auth.uid()
  );
  return next_restaurant;
end;
$$;

grant execute on function public.set_restaurant_michelin_recognition(uuid, text, smallint, integer, text) to authenticated;
