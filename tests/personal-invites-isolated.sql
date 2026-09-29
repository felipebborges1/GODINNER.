-- Run only against a disposable PostgreSQL database with minimal auth.users
-- and profiles fixtures, after applying the personal-invites migration.
do $$
declare
  first_code text;
  first_visit uuid;
  second_visit uuid;
begin
  insert into auth.users (id, confirmed_at) values
    ('11111111-1111-4111-8111-111111111111', now()),
    ('22222222-2222-4222-8222-222222222222', now()),
    ('44444444-4444-4444-8444-444444444444', now());
  update auth.users set created_at = now() - interval '1 day'
  where id = '44444444-4444-4444-8444-444444444444';
  insert into public.profiles (id, name) values
    ('11111111-1111-4111-8111-111111111111', 'First inviter'),
    ('22222222-2222-4222-8222-222222222222', 'Second inviter'),
    ('44444444-4444-4444-8444-444444444444', 'Existing account');
  if (select count(*) from public.personal_invite_codes) <> 3 then
    raise exception 'code trigger did not create exactly one per profile';
  end if;
  select code into first_code from public.personal_invite_codes
  where inviter_id = '11111111-1111-4111-8111-111111111111';
  if length(first_code) <> 32 then raise exception 'code is not opaque UUID-derived hex'; end if;
  update public.profiles set name = 'Renamed inviter'
  where id = '11111111-1111-4111-8111-111111111111';
  if (select code from public.personal_invite_codes
      where inviter_id = '11111111-1111-4111-8111-111111111111') <> first_code then
    raise exception 'profile edit rotated invite code';
  end if;

  insert into public.personal_invite_visits (inviter_id, opened_at, expires_at)
  values ('11111111-1111-4111-8111-111111111111', now() - interval '1 minute', now() + interval '30 days' - interval '1 minute') returning token into first_visit;
  insert into public.personal_invite_visits (inviter_id, opened_at, expires_at)
  values ('22222222-2222-4222-8222-222222222222', now() - interval '1 minute', now() + interval '30 days' - interval '1 minute') returning token into second_visit;
  insert into auth.users (id, raw_user_meta_data)
  values ('33333333-3333-4333-8333-333333333333', jsonb_build_object('personal_invite_token', first_visit));
  insert into public.profiles (id, name)
  values ('33333333-3333-4333-8333-333333333333', 'New account');
  if (select visit_token from public.personal_invite_signups
      where invitee_id = '33333333-3333-4333-8333-333333333333') <> first_visit then
    raise exception 'email signup invite was not captured';
  end if;
  update auth.users set raw_user_meta_data = jsonb_build_object('personal_invite_token', second_visit)
  where id = '33333333-3333-4333-8333-333333333333';
  if (select visit_token from public.personal_invite_signups
      where invitee_id = '33333333-3333-4333-8333-333333333333') <> first_visit then
    raise exception 'metadata edit replaced the first invite';
  end if;
  begin
    insert into public.personal_invite_attributions (invitee_id, inviter_id, visit_token)
    values ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', first_visit);
    raise exception 'unconfirmed account was attributed';
  exception when check_violation then null;
  end;
  update auth.users set confirmed_at = now()
  where id = '33333333-3333-4333-8333-333333333333';
  insert into public.personal_invite_attributions (invitee_id, inviter_id, visit_token)
  values ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', first_visit);
  begin
    insert into public.personal_invite_attributions (invitee_id, inviter_id, visit_token)
    values ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', second_visit);
    raise exception 'duplicate attribution replaced the first';
  exception when unique_violation then null;
  end;
  begin
    insert into public.personal_invite_attributions (invitee_id, inviter_id, visit_token)
    values ('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', second_visit);
    raise exception 'self attribution was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.personal_invite_attributions (invitee_id, inviter_id, visit_token)
    values ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222', second_visit);
    raise exception 'existing account was attributed';
  exception when check_violation then null;
  end;
  if has_table_privilege('anon', 'public.personal_invite_attributions', 'select')
     or has_table_privilege('authenticated', 'public.personal_invite_visits', 'select') then
    raise exception 'invite private tables are readable by browser roles';
  end if;
  delete from public.profiles where id = '11111111-1111-4111-8111-111111111111';
  if exists (select 1 from public.personal_invite_attributions
             where invitee_id = '33333333-3333-4333-8333-333333333333')
     or exists (select 1 from public.personal_invite_signups
                where invitee_id = '33333333-3333-4333-8333-333333333333') then
    raise exception 'deleting inviter left dependent private data';
  end if;
end;
$$;
