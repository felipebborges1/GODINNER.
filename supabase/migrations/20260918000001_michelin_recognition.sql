-- Michelin recognition is deliberately nullable/unknown by default. A missing
-- value never means that a restaurant has no Michelin stars.
alter table public.restaurants
  add column if not exists michelin_status text not null default 'unknown',
  add column if not exists michelin_stars smallint,
  add column if not exists michelin_edition_year integer,
  add column if not exists michelin_source_url text,
  add column if not exists michelin_verified_at timestamptz,
  add column if not exists michelin_verified_by uuid references public.profiles(id) on delete set null;

alter table public.restaurants
  add constraint restaurants_michelin_status_check
    check (michelin_status in ('unknown', 'verified_starred', 'verified_no_star', 'needs_revalidation')),
  add constraint restaurants_michelin_stars_check
    check (michelin_stars is null or michelin_stars between 1 and 3),
  add constraint restaurants_michelin_verified_starred_check
    check (michelin_status <> 'verified_starred' or (
      michelin_stars between 1 and 3
      and michelin_edition_year between 1900 and 2100
      and michelin_source_url ~ '^https://guide\\.michelin\\.com/'
      and michelin_verified_at is not null
      and michelin_verified_by is not null
    )),
  add constraint restaurants_michelin_no_star_check
    check (michelin_status <> 'verified_no_star' or (
      michelin_stars is null
      and michelin_edition_year between 1900 and 2100
      and michelin_source_url ~ '^https://guide\\.michelin\\.com/'
      and michelin_verified_at is not null
      and michelin_verified_by is not null
    ));

create index if not exists restaurants_michelin_verified_starred_idx
  on public.restaurants (city, michelin_edition_year desc)
  where status = 'published' and michelin_status = 'verified_starred';

create table public.restaurant_michelin_recognition_history (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  michelin_status text not null check (michelin_status in ('unknown', 'verified_starred', 'verified_no_star', 'needs_revalidation')),
  michelin_stars smallint check (michelin_stars is null or michelin_stars between 1 and 3),
  michelin_edition_year integer check (michelin_edition_year is null or michelin_edition_year between 1900 and 2100),
  michelin_source_url text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default timezone('utc', now()),
  changed_by uuid not null references public.profiles(id) on delete restrict
);

create index restaurant_michelin_history_restaurant_idx
  on public.restaurant_michelin_recognition_history (restaurant_id, changed_at desc);

alter table public.restaurant_michelin_recognition_history enable row level security;
create policy restaurant_michelin_history_admin_read on public.restaurant_michelin_recognition_history
  for select to authenticated using (public.is_admin());
create policy restaurant_michelin_history_admin_insert on public.restaurant_michelin_recognition_history
  for insert to authenticated with check (public.is_admin() and changed_by = auth.uid());
grant select, insert on public.restaurant_michelin_recognition_history to authenticated;

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
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  if p_status not in ('unknown', 'verified_starred', 'verified_no_star', 'needs_revalidation') then raise exception 'invalid_michelin_status'; end if;
  if p_status = 'verified_starred' and (p_stars not between 1 and 3 or p_edition_year not between 1900 and 2100 or p_source_url !~ '^https://guide\\.michelin\\.com/') then raise exception 'invalid_michelin_verification'; end if;
  if p_status = 'verified_no_star' and (p_stars is not null or p_edition_year not between 1900 and 2100 or p_source_url !~ '^https://guide\\.michelin\\.com/') then raise exception 'invalid_michelin_verification'; end if;

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
