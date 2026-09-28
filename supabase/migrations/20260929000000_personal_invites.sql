-- Personal invites are private server-managed records. No browser role receives
-- direct table access; public pages expose only the inviter's public profile.
create table public.personal_invite_codes (
  inviter_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  constraint personal_invite_code_format check (code ~ '^[0-9a-f]{32}$')
);

-- Existing profiles receive a code once; future profiles receive one on insert.
-- Neither profile edits nor avatar changes can rotate it.
insert into public.personal_invite_codes (inviter_id)
select id from public.profiles
on conflict (inviter_id) do nothing;

create function public.create_personal_invite_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.personal_invite_codes (inviter_id) values (new.id)
  on conflict (inviter_id) do nothing;
  return new;
end;
$$;
create trigger create_personal_invite_code
after insert on public.profiles
for each row execute function public.create_personal_invite_code();

create table public.personal_invite_visits (
  token uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint personal_invite_visit_window check (expires_at = opened_at + interval '30 days')
);
create index personal_invite_visits_expiry_idx on public.personal_invite_visits(expires_at);

-- Capture the email-signup invite once at account creation. Later edits to
-- auth user metadata cannot change the pending inviter.
create table public.personal_invite_signups (
  invitee_id uuid primary key references auth.users(id) on delete cascade,
  visit_token uuid not null references public.personal_invite_visits(token) on delete cascade
);

create function public.capture_personal_invite_signup() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  raw_token text := new.raw_user_meta_data ->> 'personal_invite_token';
begin
  if raw_token is not null and raw_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    insert into public.personal_invite_signups (invitee_id, visit_token)
    select new.id, visit.token from public.personal_invite_visits visit
    where visit.token = raw_token::uuid
      and new.created_at > visit.opened_at
      and new.created_at < visit.expires_at
      and new.id <> visit.inviter_id
    on conflict (invitee_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger capture_personal_invite_signup
after insert on auth.users
for each row execute function public.capture_personal_invite_signup();

create table public.personal_invite_attributions (
  invitee_id uuid primary key references public.profiles(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  visit_token uuid not null unique references public.personal_invite_visits(token) on delete cascade,
  attributed_at timestamptz not null default now(),
  constraint personal_invite_not_self check (invitee_id <> inviter_id)
);
create index personal_invite_attributions_inviter_idx on public.personal_invite_attributions(inviter_id);

-- The database is the final authority, including when the service-role caller
-- accidentally supplies stale or conflicting invite data.
create function public.validate_personal_invite_attribution() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  visit public.personal_invite_visits;
  account auth.users;
begin
  select * into visit from public.personal_invite_visits where token = new.visit_token;
  select * into account from auth.users where id = new.invitee_id;
  if visit.token is null or account.id is null
     or visit.inviter_id <> new.inviter_id
     or account.created_at <= visit.opened_at
     or account.created_at >= visit.expires_at
     or account.confirmed_at is null
     or now() >= visit.expires_at
     or new.invitee_id = new.inviter_id then
    raise exception 'invalid_personal_invite_attribution' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_personal_invite_attribution
before insert on public.personal_invite_attributions
for each row execute function public.validate_personal_invite_attribution();

alter table public.personal_invite_codes enable row level security;
alter table public.personal_invite_visits enable row level security;
alter table public.personal_invite_signups enable row level security;
alter table public.personal_invite_attributions enable row level security;
revoke all on public.personal_invite_codes, public.personal_invite_visits, public.personal_invite_signups, public.personal_invite_attributions from anon, authenticated;
revoke all on function public.create_personal_invite_code(), public.capture_personal_invite_signup(), public.validate_personal_invite_attribution() from public;
