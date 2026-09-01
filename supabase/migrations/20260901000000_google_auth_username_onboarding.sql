-- Google identities do not provide a GODINNER username. Keep a unique, hidden
-- provisional value until the authenticated user chooses their public username.
alter table public.profiles
  add column if not exists username_needs_confirmation boolean not null default false;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  profile_username text;
  profile_name text;
  needs_username_confirmation boolean;
begin
  profile_username := lower(nullif(trim(new.raw_user_meta_data ->> 'username'), ''));
  needs_username_confirmation := profile_username is null;
  if needs_username_confirmation then
    profile_username := 'pending.' || substring(replace(new.id::text, '-', '') from 1 for 24);
  end if;
  profile_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'Novo usuário'
  );
  insert into public.profiles (id, username, username_needs_confirmation, name, bio, location)
  values (new.id, profile_username, needs_username_confirmation, profile_name, coalesce(new.raw_user_meta_data ->> 'bio', ''), coalesce(new.raw_user_meta_data ->> 'location', ''))
  on conflict (id) do nothing;
  insert into public.restaurant_lists (owner_id, name, description, is_public, type)
  values (new.id, 'Quero conhecer', 'Lugares para descobrir.', true, 'want'), (new.id, 'Já fui', 'Memórias boas pela cidade.', true, 'visited'), (new.id, 'Favoritos', 'Os favoritos da casa.', true, 'favorites')
  on conflict (owner_id, type) where type <> 'custom' do nothing;
  return new;
end;
$$;

-- A database function makes the claim atomic and keeps username validation and
-- uniqueness on the server. The simple name is deliberate for the Beta flow.
create or replace function public.claim_profile_username(requested_username text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  normalized_username text := lower(trim(coalesce(requested_username, '')));
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if normalized_username !~ '^[a-z0-9_\.]{2,32}$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;
  update public.profiles
  set username = normalized_username, username_needs_confirmation = false
  where id = auth.uid()
  returning * into updated_profile;
  if updated_profile.id is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  return updated_profile;
end;
$$;

revoke all on function public.claim_profile_username(text) from public;
grant execute on function public.claim_profile_username(text) to authenticated;
