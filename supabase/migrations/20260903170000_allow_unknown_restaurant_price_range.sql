-- A catalog entry may have no editorial price range until a trusted catalog source defines one.
-- This avoids presenting the old "$ $" default as if it were verified information.
alter table public.restaurants
  alter column price_range drop not null;

comment on column public.restaurants.price_range is
  'Editorial price range. Nullable when no trustworthy catalog reference is available.';
