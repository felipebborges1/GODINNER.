-- One-time administrative correction for reviews entered by @matheusap in BRL
-- before the product persisted the restaurant's local currency. FX date: 2026-08-31.
-- Fixed BRL/EUR rate: 0.1662. New reviews never use this conversion.
do $$
begin
  -- A clean database has no historical Beta user rows to correct.
  if not exists (select 1 from public.profiles where id = 'ca2ecaff-9692-4678-933e-fa6229f82870'::uuid) then
    return;
  end if;

  if (
    select count(*)
    from public.reviews
    where user_id = 'ca2ecaff-9692-4678-933e-fa6229f82870'::uuid
      and currency = 'EUR'
      and (id in (
        'ba440590-5b9d-4e67-a29a-6f2f790e8945'::uuid,
        '55143645-ffbc-43d2-a652-10d17fe21fd7'::uuid,
        '992b3fc0-d12c-489a-a09a-4cfff4fc730a'::uuid,
        '5d35726a-71b4-43ab-9950-73585fc33bdd'::uuid,
        'c2981816-c6c6-4e3a-b580-5447982949ef'::uuid,
        '554cc107-f843-4724-ad26-4b82e5b1fda8'::uuid,
        '89d9240a-2ac0-4cec-be27-07727524dd17'::uuid
      ) and amount_per_person = 480)
      or (id = '20faa565-8187-4ebc-a007-6ea1b25081bd'::uuid and amount_per_person = 300)
      or (id = 'c301794e-ef3f-48ff-a0bb-dae6028c2d1e'::uuid and amount_per_person = 200)
  ) <> 9 then
    raise exception 'historical Matheus BRL review set no longer matches the audited state';
  end if;
end;
$$;

-- Keep updated_at intact so the correction does not appear as a user edit.
alter table public.reviews disable trigger reviews_set_updated_at;

with corrections(review_id, original_brl, converted_eur) as (
  values
    ('ba440590-5b9d-4e67-a29a-6f2f790e8945'::uuid, 480::numeric, 79.78::numeric),
    ('55143645-ffbc-43d2-a652-10d17fe21fd7'::uuid, 480::numeric, 79.78::numeric),
    ('992b3fc0-d12c-489a-a09a-4cfff4fc730a'::uuid, 480::numeric, 79.78::numeric),
    ('5d35726a-71b4-43ab-9950-73585fc33bdd'::uuid, 480::numeric, 79.78::numeric),
    ('c2981816-c6c6-4e3a-b580-5447982949ef'::uuid, 480::numeric, 79.78::numeric),
    ('554cc107-f843-4724-ad26-4b82e5b1fda8'::uuid, 480::numeric, 79.78::numeric),
    ('89d9240a-2ac0-4cec-be27-07727524dd17'::uuid, 480::numeric, 79.78::numeric),
    ('20faa565-8187-4ebc-a007-6ea1b25081bd'::uuid, 300::numeric, 49.86::numeric),
    ('c301794e-ef3f-48ff-a0bb-dae6028c2d1e'::uuid, 200::numeric, 33.24::numeric)
)
update public.reviews as review
set amount_per_person = corrections.converted_eur,
    currency = 'EUR'
from corrections
where review.id = corrections.review_id
  and review.user_id = 'ca2ecaff-9692-4678-933e-fa6229f82870'::uuid
  and review.currency = 'EUR'
  and review.amount_per_person = corrections.original_brl;

alter table public.reviews enable trigger reviews_set_updated_at;
