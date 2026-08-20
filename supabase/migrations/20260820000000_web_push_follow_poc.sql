create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, endpoint)
);

create table if not exists public.follow_push_events (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  constraint follow_push_events_no_self check (follower_id <> following_id)
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists follow_push_events_pending_idx on public.follow_push_events(follower_id, following_id, created_at desc) where processed_at is null;

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions for each row execute function public.set_updated_at();

create or replace function public.queue_follow_push_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.follow_push_events (follower_id, following_id) values (new.follower_id, new.following_id);
  return new;
end;
$$;

drop trigger if exists follows_queue_push_event on public.follows;
create trigger follows_queue_push_event after insert on public.follows for each row execute function public.queue_follow_push_event();
revoke execute on function public.queue_follow_push_event() from public;

create or replace function public.claim_follow_push_event(p_following_id uuid)
returns table (event_id uuid, follower_id uuid, following_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare claimed_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select id into claimed_id
  from public.follow_push_events
  where follower_id = auth.uid() and following_id = p_following_id and processed_at is null
  order by created_at desc
  limit 1
  for update skip locked;

  if claimed_id is null then return; end if;
  update public.follow_push_events set processed_at = timezone('utc', now()) where id = claimed_id;
  return query select id, follower_id, following_id from public.follow_push_events where id = claimed_id;
end;
$$;

alter table public.push_subscriptions enable row level security;
alter table public.follow_push_events enable row level security;

drop policy if exists push_subscriptions_own_select on public.push_subscriptions;
drop policy if exists push_subscriptions_own_insert on public.push_subscriptions;
drop policy if exists push_subscriptions_own_update on public.push_subscriptions;
drop policy if exists push_subscriptions_own_delete on public.push_subscriptions;
create policy push_subscriptions_own_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_own_insert on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy push_subscriptions_own_update on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_own_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions, public.follow_push_events to service_role;
revoke all on public.follow_push_events from anon, authenticated;
revoke execute on function public.claim_follow_push_event(uuid) from public;
grant execute on function public.claim_follow_push_event(uuid) to authenticated;
