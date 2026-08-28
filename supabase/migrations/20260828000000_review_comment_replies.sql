-- Replies share the existing review_comments table. A persisted reply always
-- points to a root comment, while reply_to_comment_id remembers the exact
-- comment the person chose to answer without allowing deeper visual nesting.
alter table public.review_comments
  add column if not exists parent_comment_id uuid references public.review_comments(id) on delete cascade,
  add column if not exists reply_to_comment_id uuid references public.review_comments(id) on delete set null,
  add constraint review_comments_parent_not_self check (parent_comment_id is null or parent_comment_id <> id),
  add constraint review_comments_reply_target_not_self check (reply_to_comment_id is null or reply_to_comment_id <> id);

create index if not exists review_comments_root_created_idx
  on public.review_comments(review_id, parent_comment_id, created_at asc);
create index if not exists review_comments_reply_target_idx
  on public.review_comments(reply_to_comment_id);

-- Root comments keep the existing review-owner notification. Replies notify
-- their selected target instead, so the review owner is not spammed per reply.
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
  if new.parent_comment_id is not null then
    return new;
  end if;

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

alter table public.notifications
  drop constraint if exists notifications_type_check,
  drop constraint if exists notifications_reply_shape;

alter table public.notifications
  add constraint notifications_type_check check (type in ('follow', 'review_like', 'review_comment', 'comment_mention', 'comment_reply')),
  add constraint notifications_reply_shape check (
    (type <> 'comment_reply') or (review_id is not null and restaurant_id is not null and comment_id is not null)
  );

create unique index if not exists notifications_comment_reply_unique
  on public.notifications(comment_id, recipient_user_id)
  where type = 'comment_reply';

create or replace function public.notify_review_comment_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  related_restaurant_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select target.user_id, review.restaurant_id
  into recipient_id, related_restaurant_id
  from public.review_comments target
  join public.reviews review on review.id = new.review_id
  where target.id = coalesce(new.reply_to_comment_id, new.parent_comment_id)
    and target.review_id = new.review_id;

  if recipient_id is not null and recipient_id <> new.user_id then
    insert into public.notifications (recipient_user_id, actor_user_id, type, review_id, restaurant_id, comment_id)
    values (recipient_id, new.user_id, 'comment_reply', new.review_id, related_restaurant_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

-- Mentions remain independent. A reply target receives one structural reply
-- notification even when the prefilled @mention is kept in the composer.
create or replace function public.process_review_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_restaurant_id uuid;
begin
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
    and not exists (
      select 1
      from public.notifications reply_notification
      where reply_notification.type = 'comment_reply'
        and reply_notification.comment_id = new.id
        and reply_notification.recipient_user_id = mention.mentioned_user_id
    )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists review_comments_notify_reply_in_app on public.review_comments;
create trigger review_comments_notify_reply_in_app
after insert on public.review_comments
for each row execute function public.notify_review_comment_reply();

-- Direct inserts could forge reply relationships. The RPC derives the author
-- from auth.uid(), validates the review and always normalizes nesting to one
-- persisted level before the row is written.
revoke insert on public.review_comments from authenticated;

create or replace function public.create_review_comment(
  p_review_id uuid,
  p_body text,
  p_reply_to_comment_id uuid default null
)
returns public.review_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_comment public.review_comments;
  root_comment_id uuid;
  inserted_comment public.review_comments;
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 500 then
    raise exception 'invalid_comment_body' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.reviews review
    join public.restaurants restaurant on restaurant.id = review.restaurant_id
    where review.id = p_review_id
      and (restaurant.status = 'published' or restaurant.submitted_by = actor_id or public.is_admin())
  ) then
    raise exception 'review_not_visible' using errcode = '42501';
  end if;

  if p_reply_to_comment_id is not null then
    select * into target_comment
    from public.review_comments
    where id = p_reply_to_comment_id;

    if not found or target_comment.review_id <> p_review_id then
      raise exception 'invalid_reply_target' using errcode = '22023';
    end if;

    root_comment_id := coalesce(target_comment.parent_comment_id, target_comment.id);
  end if;

  insert into public.review_comments (review_id, user_id, body, parent_comment_id, reply_to_comment_id)
  values (p_review_id, actor_id, btrim(regexp_replace(p_body, '\\s+', ' ', 'g')), root_comment_id, p_reply_to_comment_id)
  returning * into inserted_comment;

  return inserted_comment;
end;
$$;

revoke execute on function public.create_review_comment(uuid, text, uuid) from public;
grant execute on function public.create_review_comment(uuid, text, uuid) to authenticated;
revoke execute on function public.notify_review_comment_reply() from public;
