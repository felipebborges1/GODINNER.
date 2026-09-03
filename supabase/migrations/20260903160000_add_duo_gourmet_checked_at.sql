alter table public.restaurants
  add column if not exists duo_gourmet_checked_at timestamptz null;

comment on column public.restaurants.duo_gourmet_checked_at is
  'Timestamp of a reliable Duo Gourmet verification; null means not verified or inconclusive.';
