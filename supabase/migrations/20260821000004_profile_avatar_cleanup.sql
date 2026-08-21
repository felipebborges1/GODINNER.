-- New accounts intentionally start without an avatar. A profile photo can only
-- be added later through the authenticated profile flow.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare profile_username text;
begin
  profile_username := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  insert into public.profiles (id, username, name, bio, location)
  values (new.id, profile_username, coalesce(new.raw_user_meta_data ->> 'name', profile_username), coalesce(new.raw_user_meta_data ->> 'bio', ''), coalesce(new.raw_user_meta_data ->> 'location', ''))
  on conflict (id) do nothing;
  insert into public.restaurant_lists (owner_id, name, description, is_public, type)
  values (new.id, 'Quero conhecer', 'Lugares para descobrir.', true, 'want'), (new.id, 'Já fui', 'Memórias boas pela cidade.', true, 'visited'), (new.id, 'Favoritos', 'Os favoritos da casa.', true, 'favorites')
  on conflict (owner_id, type) where type <> 'custom' do nothing;
  return new;
end;
$$;

-- Remove only known generated-avatar providers; real uploaded Storage paths remain.
update public.profiles
set avatar_url = null
where avatar_url ilike '%pravatar.%'
   or avatar_url ilike '%ui-avatars.%'
   or avatar_url ilike '%randomuser.%';
