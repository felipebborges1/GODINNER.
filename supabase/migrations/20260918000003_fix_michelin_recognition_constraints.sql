-- The original constraints used the same over-escaped regular expression as
-- the initial RPC validation. Replace only the URL predicate; existing rows
-- are neither updated nor inserted by this migration.
alter table public.restaurants
  drop constraint restaurants_michelin_verified_starred_check,
  drop constraint restaurants_michelin_no_star_check,
  add constraint restaurants_michelin_verified_starred_check
    check (michelin_status <> 'verified_starred' or (
      michelin_stars between 1 and 3
      and michelin_edition_year between 1900 and 2100
      and (
        michelin_source_url like 'https://guide.michelin.com/%'
        or michelin_source_url like 'https://%.guide.michelin.com/%'
      )
      and michelin_verified_at is not null
      and michelin_verified_by is not null
    )),
  add constraint restaurants_michelin_no_star_check
    check (michelin_status <> 'verified_no_star' or (
      michelin_stars is null
      and michelin_edition_year between 1900 and 2100
      and (
        michelin_source_url like 'https://guide.michelin.com/%'
        or michelin_source_url like 'https://%.guide.michelin.com/%'
      )
      and michelin_verified_at is not null
      and michelin_verified_by is not null
    ));
