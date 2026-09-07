-- READ ONLY. This is not a rollback executor. No deletion authorized by this file.
-- Recheck under parent row locks before any future deletion; activity/edit => MANUAL_REVIEW_REQUIRED.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='15s';
WITH batch AS (SELECT unnest(ARRAY['9dfa5906-33c9-5d94-9332-64606fefc9af','324ee833-dd86-5222-bae6-3441d8db34f5','4c31b41d-94c6-5bf5-aeeb-138d310c92df','a498bb22-2571-50ab-9268-601ed30d621e','1e592c62-f22c-5892-8a5f-299c46024c16','f70333a5-48bb-5823-b655-1420b73ee403','9e15d9bc-a75a-59f3-b789-b314de5acafd','e550f1f3-5c49-5941-a132-8baa35a774b0','79129cdd-29fb-547e-b500-b192e0e38396','8fea3083-03b7-5933-b23c-c7684a542995','62339e3f-19d0-53fb-aa0d-eb6f7bb800c9','0a750d62-c256-50b2-80aa-6b8084aadf94','507cd4cb-8cc1-5d81-b8fc-38afc0814995','d8c84394-2a2c-5bdf-adf2-402c00259f87','2795da10-8404-51c7-b4c0-8b9bdcb305e4','3cb67d58-861b-51b2-a95b-59d5d2d08a0f','f5cff15f-b957-5902-b309-418d4d828d40','218103c8-80cf-5c97-a7f4-905ec110754f','c1ba3ae1-d1fd-5812-ba3e-f88f54e8d824','04970fb3-67b7-5218-8f54-982937496099','3abfa8f3-e146-5493-b10a-25d785bdd5d5','3db1cd0f-4f0e-5b8c-9c7c-a39910a0014d']::uuid[]) AS id)
SELECT b.id, r.google_place_id, r.updated_at,
 (SELECT count(*) FROM public.reviews x WHERE x.restaurant_id=b.id) AS reviews,
 (SELECT count(*) FROM public.restaurant_list_items x WHERE x.restaurant_id=b.id) AS list_items,
 (SELECT count(*) FROM public.notifications x WHERE x.restaurant_id=b.id) AS notifications,
 (SELECT count(*) FROM public.restaurants x WHERE x.merged_into_id=b.id) AS merged_references
FROM batch b LEFT JOIN public.restaurants r ON r.id=b.id ORDER BY b.id;
ROLLBACK;
-- Any review also protects all its likes/comments/photos/mentions and related social data.
-- Follows are profile relations, not restaurant relations; consult live FK graph again for schema changes.
-- Do not use timestamps/date ranges as deletion predicates. Verify exact receipt ownership, unchanged payload and all current dependencies.
