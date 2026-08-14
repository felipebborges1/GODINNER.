alter table public.restaurants
  add column if not exists cover_photo_path text;

comment on column public.restaurants.cover_photo_path is
  'Private Storage path for the restaurant cover image. Signed URLs are generated at read time.';
