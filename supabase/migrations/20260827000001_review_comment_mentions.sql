-- Mentions are resolved only from persisted public profiles. The client sends
-- comment text, never recipient ids, so this remains safe for manual typing.
create table if not exists public.review_comment_mentions (
  comment_id uuid not null references public.review_comments(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (comment_id, mentioned_user_id)
);

create index if not exists review_comment_mentions_user_created_idx
  on public.review_comment_mentions(mentioned_user_id, created_at desc);

alter table public.review_comment_mentions enable row level security;

drop policy if exists review_comment_mentions_read_visible_comment on public.review_comment_mentions;
create policy review_comment_mentions_read_visible_comment on public.review_comment_mentions
for select using (
  exists (
    select 1
    from public.review_comments comment_row
    join public.reviews review on review.id = comment_row.review_id
    join public.restaurants restaurant on restaurant.id = review.restaurant_id
    where comment_row.id = comment_id
      and (restaurant.status = 'published' or restaurant.submitted_by = auth.uid() or public.is_admin())
  )
);

revoke all on public.review_comment_mentions from anon, authenticated;
grant select on public.review_comment_mentions to anon, authenticated;
grant all on public.review_comment_mentions to service_role;

alter table public.notifications
  drop constraint if exists notifications_type_check,
  drop constraint if exists notifications_mention_shape;

alter table public.notifications
  add constraint notifications_type_check check (type in ('follow', 'review_like', 'review_comment', 'comment_mention')),
  add constraint notifications_mention_shape check (
    (type <> 'comment_mention') or (review_id is not null and restaurant_id is not null and comment_id is not null)
  );

create unique index if not exists notifications_comment_mention_unique
  on public.notifications(comment_id, recipient_user_id)
  where type = 'comment_mention';

create or replace function public.process_review_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_restaurant_id uuid;
begin
  -- The profile constraint allows only [a-z0-9_.], so escaping dots keeps this
  -- exact-match regex aligned with the username schema rather than fuzzy.
  insert into public.review_comment_mentions (comment_id, mentioned_user_id)
  select new.id, profile.id
  from public.profiles profile
  where lower(new.body) ~ (
    '(^|[^a-z0-9_.])@' || replace(profile.username, '.', E'\\.') || '([^a-z0-9_.]|$)'
  )
  on conflict do nothing;

  select restaurant_id into related_restaurant_id
  from public.reviews
  where id = new.review_id;

  -- The regular comment notification is created by the preceding trigger.
  -- An explicit mention takes precedence for the review owner, avoiding spam.
  delete from public.notifications notification
  using public.review_comment_mentions mention
  where notification.type = 'review_comment'
    and notification.comment_id = new.id
    and mention.comment_id = new.id
    and notification.recipient_user_id = mention.mentioned_user_id;

  insert into public.notifications (recipient_user_id, actor_user_id, type, review_id, restaurant_id, comment_id)
  select mention.mentioned_user_id, new.user_id, 'comment_mention', new.review_id, related_restaurant_id, new.id
  from public.review_comment_mentions mention
  where mention.comment_id = new.id
    and mention.mentioned_user_id <> new.user_id
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists review_comments_process_mentions on public.review_comments;
create trigger review_comments_process_mentions
after insert on public.review_comments
for each row execute function public.process_review_comment_mentions();

revoke execute on function public.process_review_comment_mentions() from public;
