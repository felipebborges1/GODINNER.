-- Persistent in-app notifications are generated from the social action that
-- caused them. Clients can only read their own records and call the narrowly
-- scoped RPCs below to mark them as read.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow', 'review_like', 'review_comment')),
  review_id uuid references public.reviews(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  comment_id uuid references public.review_comments(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  constraint notifications_no_self check (recipient_user_id <> actor_user_id),
  constraint notifications_follow_shape check (
    (type <> 'follow') or (review_id is null and restaurant_id is null and comment_id is null)
  ),
  constraint notifications_like_shape check (
    (type <> 'review_like') or (review_id is not null and restaurant_id is not null and comment_id is null)
  ),
  constraint notifications_comment_shape check (
    (type <> 'review_comment') or (review_id is not null and restaurant_id is not null and comment_id is not null)
  )
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_user_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_user_id, created_at desc)
  where read_at is null;
create unique index if not exists notifications_follow_unique
  on public.notifications(actor_user_id, recipient_user_id)
  where type = 'follow';
create unique index if not exists notifications_review_like_unique
  on public.notifications(actor_user_id, recipient_user_id, review_id)
  where type = 'review_like';
create unique index if not exists notifications_review_comment_unique
  on public.notifications(comment_id)
  where type = 'review_comment';

create or replace function public.notify_new_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id <> new.following_id then
    insert into public.notifications (recipient_user_id, actor_user_id, type)
    values (new.following_id, new.follower_id, 'follow')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.notify_review_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  related_restaurant_id uuid;
begin
  select review.user_id, review.restaurant_id
  into recipient_id, related_restaurant_id
  from public.reviews review
  where review.id = new.review_id;

  if recipient_id is not null and recipient_id <> new.user_id then
    insert into public.notifications (recipient_user_id, actor_user_id, type, review_id, restaurant_id)
    values (recipient_id, new.user_id, 'review_like', new.review_id, related_restaurant_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.remove_review_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'review_like'
    and actor_user_id = old.user_id
    and review_id = old.review_id;
  return old;
end;
$$;

create or replace function public.notify_review_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  related_restaurant_id uuid;
begin
  select review.user_id, review.restaurant_id
  into recipient_id, related_restaurant_id
  from public.reviews review
  where review.id = new.review_id;

  if recipient_id is not null and recipient_id <> new.user_id then
    insert into public.notifications (recipient_user_id, actor_user_id, type, review_id, restaurant_id, comment_id)
    values (recipient_id, new.user_id, 'review_comment', new.review_id, related_restaurant_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists follows_notify_in_app on public.follows;
create trigger follows_notify_in_app
after insert on public.follows
for each row execute function public.notify_new_follow();

drop trigger if exists review_likes_notify_in_app on public.review_likes;
create trigger review_likes_notify_in_app
after insert on public.review_likes
for each row execute function public.notify_review_like();

drop trigger if exists review_likes_remove_in_app_notification on public.review_likes;
create trigger review_likes_remove_in_app_notification
after delete on public.review_likes
for each row execute function public.remove_review_like_notification();

drop trigger if exists review_comments_notify_in_app on public.review_comments;
create trigger review_comments_notify_in_app
after insert on public.review_comments
for each row execute function public.notify_review_comment();

alter table public.notifications enable row level security;

drop policy if exists notifications_recipient_read on public.notifications;
create policy notifications_recipient_read on public.notifications
for select to authenticated
using (recipient_user_id = auth.uid());

-- Direct client inserts, deletes and updates are deliberately not granted.
-- The write functions below always scope the operation to auth.uid().
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, timezone('utc', now()))
  where id = p_notification_id
    and recipient_user_id = auth.uid();

  return found;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.notifications
  set read_at = timezone('utc', now())
  where recipient_user_id = auth.uid()
    and read_at is null;
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke execute on function public.notify_new_follow() from public;
revoke execute on function public.notify_review_like() from public;
revoke execute on function public.remove_review_like_notification() from public;
revoke execute on function public.notify_review_comment() from public;
revoke execute on function public.mark_notification_read(uuid) from public;
revoke execute on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
