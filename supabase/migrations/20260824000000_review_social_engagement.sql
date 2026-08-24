-- Social engagement is intentionally attached to reviews: the Beta has no
-- independent post model. Defaults use auth.uid() so clients never submit a user id.
create table if not exists public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (review_id, user_id)
);

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists review_likes_review_created_idx on public.review_likes(review_id, created_at desc);
create index if not exists review_comments_review_created_idx on public.review_comments(review_id, created_at asc);
create index if not exists review_comments_user_idx on public.review_comments(user_id);

drop trigger if exists review_comments_set_updated_at on public.review_comments;
create trigger review_comments_set_updated_at
before update on public.review_comments
for each row execute function public.set_updated_at();

alter table public.review_likes enable row level security;
alter table public.review_comments enable row level security;

-- A like or comment is readable exactly when its parent review is readable.
drop policy if exists review_likes_read_visible_review on public.review_likes;
create policy review_likes_read_visible_review on public.review_likes
for select using (
  exists (
    select 1
    from public.reviews review
    join public.restaurants restaurant on restaurant.id = review.restaurant_id
    where review.id = review_id
      and (restaurant.status = 'published' or restaurant.submitted_by = auth.uid() or public.is_admin())
  )
);

drop policy if exists review_likes_insert_own on public.review_likes;
create policy review_likes_insert_own on public.review_likes
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.reviews review
    join public.restaurants restaurant on restaurant.id = review.restaurant_id
    where review.id = review_id
      and (restaurant.status = 'published' or restaurant.submitted_by = auth.uid() or public.is_admin())
  )
);

drop policy if exists review_likes_delete_own on public.review_likes;
create policy review_likes_delete_own on public.review_likes
for delete to authenticated using (user_id = auth.uid());

drop policy if exists review_comments_read_visible_review on public.review_comments;
create policy review_comments_read_visible_review on public.review_comments
for select using (
  exists (
    select 1
    from public.reviews review
    join public.restaurants restaurant on restaurant.id = review.restaurant_id
    where review.id = review_id
      and (restaurant.status = 'published' or restaurant.submitted_by = auth.uid() or public.is_admin())
  )
);

drop policy if exists review_comments_insert_own on public.review_comments;
create policy review_comments_insert_own on public.review_comments
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.reviews review
    join public.restaurants restaurant on restaurant.id = review.restaurant_id
    where review.id = review_id
      and (restaurant.status = 'published' or restaurant.submitted_by = auth.uid() or public.is_admin())
  )
);

drop policy if exists review_comments_delete_owner_or_admin on public.review_comments;
create policy review_comments_delete_owner_or_admin on public.review_comments
for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- The summary keeps Feed, Profile and Restaurant Profile consistent without
-- loading every comment or issuing an N+1 query. security_invoker preserves RLS.
create or replace view public.review_social_summaries
with (security_invoker = true) as
select
  review.id as review_id,
  (select count(*)::integer from public.review_likes like_row where like_row.review_id = review.id) as like_count,
  (select count(*)::integer from public.review_comments comment_row where comment_row.review_id = review.id) as comment_count,
  exists (
    select 1 from public.review_likes my_like
    where my_like.review_id = review.id and my_like.user_id = auth.uid()
  ) as liked_by_me
from public.reviews review;

grant select on public.review_likes, public.review_comments, public.review_social_summaries to anon;
grant select, insert, delete on public.review_likes, public.review_comments to authenticated;
grant select on public.review_social_summaries to authenticated;
grant all on public.review_likes, public.review_comments, public.review_social_summaries to service_role;
