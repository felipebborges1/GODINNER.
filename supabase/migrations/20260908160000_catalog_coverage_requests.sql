-- Coverage demand is deliberately city-level. Coordinates, email addresses,
-- usernames and browser fingerprints are never stored in these tables.
create or replace function public.normalize_catalog_coverage_part(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
    translate(lower(trim(coalesce(value, ''))), 'áàâãäåéèêëíìîïóòôõöúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn'),
    '\s+', ' ', 'g'
  )
$$;

create table if not exists public.catalog_coverage_requests (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  state text,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  city_key text not null,
  state_key text not null default '',
  first_detected_at timestamptz not null default timezone('utc', now()),
  last_detected_at timestamptz not null default timezone('utc', now()),
  signal_count integer not null default 0 check (signal_count >= 0),
  unique_user_count integer not null default 0 check (unique_user_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (city_key, state_key, country_code)
);

create table if not exists public.catalog_coverage_request_signals (
  coverage_request_id uuid not null references public.catalog_coverage_requests(id) on delete cascade,
  actor_key text not null,
  actor_kind text not null check (actor_kind in ('user', 'session')),
  created_at timestamptz not null default timezone('utc', now()),
  last_detected_at timestamptz not null default timezone('utc', now()),
  primary key (coverage_request_id, actor_key)
);

create index if not exists restaurants_published_coverage_city_idx
  on public.restaurants (public.normalize_catalog_coverage_part(city), country_code)
  where status = 'published';

drop trigger if exists catalog_coverage_requests_set_updated_at on public.catalog_coverage_requests;
create trigger catalog_coverage_requests_set_updated_at
before update on public.catalog_coverage_requests
for each row execute function public.set_updated_at();

alter table public.catalog_coverage_requests enable row level security;
alter table public.catalog_coverage_request_signals enable row level security;
revoke all on public.catalog_coverage_requests from anon, authenticated;
revoke all on public.catalog_coverage_request_signals from anon, authenticated;
grant all on public.catalog_coverage_requests to service_role;
grant all on public.catalog_coverage_request_signals to service_role;

create or replace function public.record_catalog_coverage_signal(
  p_city text,
  p_state text default null,
  p_country_code text default null,
  p_session_id uuid default null
)
returns table(zero_coverage boolean, coverage_recorded boolean, coverage_request_id uuid, signal_recorded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_city text;
  normalized_state text;
  normalized_country text;
  request_id uuid;
  actor text;
  actor_type text;
  inserted_signal boolean := false;
begin
  normalized_city := public.normalize_catalog_coverage_part(p_city);
  normalized_state := public.normalize_catalog_coverage_part(p_state);
  normalized_country := upper(trim(coalesce(p_country_code, '')));
  if char_length(normalized_city) not between 1 and 120 or char_length(normalized_state) > 120 or normalized_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid_coverage_region' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.restaurants restaurant
    where restaurant.status = 'published'
      and public.normalize_catalog_coverage_part(restaurant.city) = normalized_city
      and coalesce(restaurant.country_code, '') = normalized_country
  ) then
    return query select false, false, null::uuid, false;
    return;
  end if;

  -- The zero-coverage response must survive a telemetry write failure so Home
  -- remains usable; no client-provided counter is trusted.
  begin
    insert into public.catalog_coverage_requests (city, state, country_code, city_key, state_key, first_detected_at, last_detected_at)
    values (trim(p_city), nullif(trim(p_state), ''), normalized_country, normalized_city, normalized_state, timezone('utc', now()), timezone('utc', now()))
    on conflict (city_key, state_key, country_code) do update
      set last_detected_at = excluded.last_detected_at
    returning id into request_id;

    if auth.uid() is not null then
      actor := 'user:' || auth.uid()::text;
      actor_type := 'user';
    elsif p_session_id is not null then
      actor := 'session:' || p_session_id::text;
      actor_type := 'session';
    end if;

    if actor is not null then
      insert into public.catalog_coverage_request_signals (coverage_request_id, actor_key, actor_kind, last_detected_at)
      values (request_id, actor, actor_type, timezone('utc', now()))
      on conflict (coverage_request_id, actor_key) do update
        set last_detected_at = excluded.last_detected_at
      returning (xmax = 0) into inserted_signal;

      if inserted_signal then
        update public.catalog_coverage_requests
        set signal_count = signal_count + 1,
            unique_user_count = unique_user_count + case when actor_type = 'user' then 1 else 0 end
        where id = request_id;
      end if;
    end if;

    return query select true, true, request_id, coalesce(inserted_signal, false);
  exception when others then
    return query select true, false, null::uuid, false;
  end;
end;
$$;

revoke execute on function public.normalize_catalog_coverage_part(text) from public;
revoke execute on function public.record_catalog_coverage_signal(text, text, text, uuid) from public;
grant execute on function public.record_catalog_coverage_signal(text, text, text, uuid) to anon, authenticated;
