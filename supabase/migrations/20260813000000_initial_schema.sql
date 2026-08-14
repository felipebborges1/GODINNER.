create extension if not exists "pgcrypto";

create type public.app_role as enum ('user', 'admin');
create type public.restaurant_category as enum ('restaurant', 'bar');
create type public.restaurant_status as enum ('published', 'pending_review', 'rejected');
create type public.list_type as enum ('want', 'visited', 'favorites', 'custom');
create type public.price_range as enum ('$', '$$', '$$$', '$$$$');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(trim(username)) and username ~ '^[a-z0-9_\\.]{2,32}$'),
  name text not null check (length(trim(name)) > 0),
  avatar_url text,
  bio text not null default '',
  location text not null default '',
  role public.app_role not null default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(trim(slug)) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 1),
  address text not null default '', city text not null check (length(trim(city)) > 0), neighborhood text not null default '',
  latitude double precision not null check (latitude between -90 and 90), longitude double precision not null check (longitude between -180 and 180),
  category public.restaurant_category not null, cuisines text[] not null default '{}', price_range public.price_range not null,
  instagram text, website text, phone text, chef text not null default '', cover_photo_url text,
  status public.restaurant_status not null default 'pending_review', submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz, moderated_by uuid references public.profiles(id) on delete set null, moderated_at timestamptz,
  rejection_reason text, merged_into_id uuid references public.restaurants(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now()),
  constraint restaurants_rejection_reason_check check (status <> 'rejected' or length(trim(coalesce(rejection_reason, ''))) > 0),
  constraint restaurants_merge_self_check check (merged_into_id is null or merged_into_id <> id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade, rating numeric(3,1) not null check (rating between 0 and 10),
  comment text not null default '', amount_per_person numeric(10,2) check (amount_per_person is null or amount_per_person >= 0), visit_date date not null,
  created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table public.review_photos (
  id uuid primary key default gen_random_uuid(), review_id uuid not null references public.reviews(id) on delete cascade,
  storage_path text not null unique, position smallint not null check (position between 0 and 4), created_at timestamptz not null default timezone('utc', now()), unique (review_id, position)
);

create table public.restaurant_lists (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) > 0), description text not null default '', is_public boolean not null default true,
  type public.list_type not null default 'custom', cover_photo_url text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create unique index restaurant_lists_one_default_per_type on public.restaurant_lists(owner_id, type) where type <> 'custom';

create table public.restaurant_list_items (
  list_id uuid not null references public.restaurant_lists(id) on delete cascade, restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key (list_id, restaurant_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade, following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()), primary key (follower_id, following_id), constraint follows_no_self check (follower_id <> following_id)
);

create index restaurants_status_idx on public.restaurants(status);
create index restaurants_city_neighborhood_idx on public.restaurants(city, neighborhood);
create index restaurants_pending_submitted_idx on public.restaurants(submitted_at desc) where status = 'pending_review';
create index reviews_restaurant_idx on public.reviews(restaurant_id);
create index reviews_user_idx on public.reviews(user_id);
create index reviews_created_idx on public.reviews(created_at desc);
create index lists_owner_idx on public.restaurant_lists(owner_id);
create index list_items_list_idx on public.restaurant_list_items(list_id);
create index follows_follower_idx on public.follows(follower_id);
create index follows_following_idx on public.follows(following_id);

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger restaurants_set_updated_at before update on public.restaurants for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews for each row execute function public.set_updated_at();
create trigger lists_set_updated_at before update on public.restaurant_lists for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare profile_username text;
begin
  profile_username := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  insert into public.profiles (id, username, name, avatar_url, bio, location) values (new.id, profile_username, coalesce(new.raw_user_meta_data ->> 'name', profile_username), new.raw_user_meta_data ->> 'avatar_url', coalesce(new.raw_user_meta_data ->> 'bio', ''), coalesce(new.raw_user_meta_data ->> 'location', '')) on conflict (id) do nothing;
  insert into public.restaurant_lists (owner_id, name, description, is_public, type) values (new.id, 'Quero conhecer', 'Lugares para descobrir.', true, 'want'), (new.id, 'Já fui', 'Memórias boas pela cidade.', true, 'visited'), (new.id, 'Favoritos', 'Os favoritos da casa.', true, 'favorites') on conflict (owner_id, type) where type <> 'custom' do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;
create or replace function public.current_role() returns public.app_role language sql stable security definer set search_path = public as $$ select role from public.profiles where id = auth.uid(); $$;

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.reviews enable row level security;
alter table public.review_photos enable row level security;
alter table public.restaurant_lists enable row level security;
alter table public.restaurant_list_items enable row level security;
alter table public.follows enable row level security;

create policy profiles_public_read on public.profiles for select using (true);
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = public.current_role());
create policy restaurants_public_read on public.restaurants for select using (status = 'published' or submitted_by = auth.uid() or public.is_admin());
create policy restaurants_authenticated_insert on public.restaurants for insert to authenticated with check (submitted_by = auth.uid() and status = 'pending_review');
create policy restaurants_admin_update on public.restaurants for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reviews_public_read on public.reviews for select using (exists(select 1 from public.restaurants r where r.id = restaurant_id and (r.status = 'published' or r.submitted_by = auth.uid() or public.is_admin())));
create policy reviews_self_insert on public.reviews for insert to authenticated with check (user_id = auth.uid() and exists(select 1 from public.restaurants r where r.id = restaurant_id and r.status <> 'rejected'));
create policy reviews_self_update on public.reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_self_delete on public.reviews for delete to authenticated using (user_id = auth.uid());
create policy review_photos_public_read on public.review_photos for select using (exists(select 1 from public.reviews v join public.restaurants r on r.id = v.restaurant_id where v.id = review_id and r.status = 'published'));
create policy review_photos_owner_manage on public.review_photos for all to authenticated using (exists(select 1 from public.reviews v where v.id = review_id and v.user_id = auth.uid())) with check (exists(select 1 from public.reviews v where v.id = review_id and v.user_id = auth.uid()));
create policy lists_read_public_or_owner on public.restaurant_lists for select using (is_public or owner_id = auth.uid());
create policy lists_owner_insert on public.restaurant_lists for insert to authenticated with check (owner_id = auth.uid());
create policy lists_owner_update on public.restaurant_lists for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy lists_owner_delete on public.restaurant_lists for delete to authenticated using (owner_id = auth.uid());
create policy list_items_read_public_or_owner on public.restaurant_list_items for select using (exists(select 1 from public.restaurant_lists l where l.id = list_id and (l.is_public or l.owner_id = auth.uid())));
create policy list_items_owner_insert on public.restaurant_list_items for insert to authenticated with check (exists(select 1 from public.restaurant_lists l where l.id = list_id and l.owner_id = auth.uid()));
create policy list_items_owner_delete on public.restaurant_list_items for delete to authenticated using (exists(select 1 from public.restaurant_lists l where l.id = list_id and l.owner_id = auth.uid()));
create policy follows_public_read on public.follows for select using (true);
create policy follows_self_insert on public.follows for insert to authenticated with check (follower_id = auth.uid() and follower_id <> following_id);
create policy follows_self_delete on public.follows for delete to authenticated using (follower_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']), ('restaurant-submissions', 'restaurant-submissions', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']), ('review-photos', 'review-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;
create policy storage_owner_read on storage.objects for select to authenticated using ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin());
create policy storage_owner_insert on storage.objects for insert to authenticated with check (bucket_id in ('avatars', 'restaurant-submissions', 'review-photos') and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_owner_delete on storage.objects for delete to authenticated using ((storage.foldername(name))[1] = auth.uid()::text);

-- Explicit Postgres privileges complement RLS. The API roles must have table
-- privileges before their row policies can evaluate access.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles, public.restaurants, public.reviews, public.review_photos, public.restaurant_lists, public.restaurant_list_items, public.follows to anon;
grant select, insert, update, delete on public.profiles, public.restaurants, public.reviews, public.review_photos, public.restaurant_lists, public.restaurant_list_items, public.follows to authenticated;
grant all on public.profiles, public.restaurants, public.reviews, public.review_photos, public.restaurant_lists, public.restaurant_list_items, public.follows to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
