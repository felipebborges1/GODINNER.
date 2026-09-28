-- Optional public link for a profile. Existing profiles remain unchanged.
alter table public.profiles add column if not exists website_url text;
