-- Phase C: PREPARED ONLY; never executed in this phase. READ ONLY.
-- Run only against project gzypncrwvzatzzhtehjs in an authorized SQL session.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT current_database(), current_user, current_setting('transaction_read_only');
SELECT status, count(*) FROM public.restaurants GROUP BY status ORDER BY status;
SELECT city, count(*) FROM public.restaurants WHERE status='published' GROUP BY city ORDER BY city;
SELECT i.indexrelid::regclass AS index_name, i.indisunique, i.indisvalid, pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index i WHERE i.indrelid='public.restaurants'::regclass ORDER BY index_name;
SELECT conname, contype, conrelid::regclass AS source_table, confrelid::regclass AS target_table, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid='public.restaurants'::regclass OR confrelid='public.restaurants'::regclass;
-- Recursive FK inventory: includes grandchildren that could be affected by cascades.
WITH RECURSIVE dependencies AS (
 SELECT c.oid,c.conrelid,c.confrelid,ARRAY[c.confrelid,c.conrelid] AS path FROM pg_constraint c WHERE c.contype='f' AND c.confrelid='public.restaurants'::regclass
 UNION ALL
 SELECT c.oid,c.conrelid,c.confrelid,d.path||c.conrelid FROM pg_constraint c JOIN dependencies d ON c.confrelid=d.conrelid WHERE c.contype='f' AND NOT c.conrelid=ANY(d.path)
) SELECT DISTINCT conrelid::regclass AS child_table,confrelid::regclass AS parent_table,pg_get_constraintdef(oid) FROM dependencies;
SELECT table_schema,table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns WHERE (table_schema='public' AND table_name='restaurants') OR column_name IN ('restaurant_id','merged_into_id') ORDER BY table_schema,table_name,ordinal_position;
SELECT tgname,pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid='public.restaurants'::regclass AND NOT tgisinternal;
SELECT schemaname,tablename,policyname,cmd,qual,with_check FROM pg_policies WHERE tablename IN ('restaurants','reviews','restaurant_list_items','notifications');
SELECT google_place_id,count(*) FROM public.restaurants WHERE google_place_id IS NOT NULL GROUP BY google_place_id HAVING count(*)>1;
WITH batch(id,place_id,slug) AS (VALUES
  ('9dfa5906-33c9-5d94-9332-64606fefc9af'::uuid, 'ChIJoddasdOxnZMRG7WJXgD9cp8', 'acai-do-mato-cuiaba-9dfa5906'),
  ('324ee833-dd86-5222-bae6-3441d8db34f5'::uuid, 'ChIJZfCYAgyxnZMR7WvyW987cSE', 'bravus-cuiaba-324ee833'),
  ('4c31b41d-94c6-5bf5-aeeb-138d310c92df'::uuid, 'ChIJB91dDmixnZMRU9l5uYBNU7E', 'bom-beef-burgers-goiabeiras-cuiaba-4c31b41d'),
  ('a498bb22-2571-50ab-9268-601ed30d621e'::uuid, 'ChIJxwdKHgCxnZMRW4dgweRitKc', 'bom-beef-burgers-shopping-3-americas-cuiaba-a498bb22'),
  ('1e592c62-f22c-5892-8a5f-299c46024c16'::uuid, 'ChIJ3RuYcfKxnZMRqR3FQldQ22Y', 'cerveja-de-garrafa-cuiaba-1e592c62'),
  ('f70333a5-48bb-5823-b655-1420b73ee403'::uuid, 'ChIJvy-07CewnZMRc2qQbv-XuYE', 'cozinha-dos-fundos-jardim-das-americas-cuiaba-f70333a5'),
  ('9e15d9bc-a75a-59f3-b789-b314de5acafd'::uuid, 'ChIJfdC2wVyxnZMRZUcXCtM1Fi0', 'cozinha-dos-fundos-pantanal-shopping-cuiaba-9e15d9bc'),
  ('e550f1f3-5c49-5941-a132-8baa35a774b0'::uuid, 'ChIJ7ySxxPKznZMRzjlyR-Kt8tY', 'cozinha-dos-fundos-shopping-estacao-cuiaba-cuiaba-e550f1f3'),
  ('79129cdd-29fb-547e-b500-b192e0e38396'::uuid, 'ChIJsYBuoY-xnZMRn-CbJ4ulFIU', 'ditado-popular-cuiaba-79129cdd'),
  ('8fea3083-03b7-5933-b23c-c7684a542995'::uuid, 'ChIJH-iys_uwnZMRZIJWakzYto0', 'emporio-serra-grande-cuiaba-8fea3083'),
  ('62339e3f-19d0-53fb-aa0d-eb6f7bb800c9'::uuid, 'ChIJr4U5MoOxnZMRcrHmtTkAXAs', 'hookerz-american-bar-cuiaba-62339e3f'),
  ('0a750d62-c256-50b2-80aa-6b8084aadf94'::uuid, 'ChIJlefQkySxnZMRWyCRAKOV2ek', 'joao-e-o-boi-cuiaba-0a750d62'),
  ('507cd4cb-8cc1-5d81-b8fc-38afc0814995'::uuid, 'ChIJ-eR99dOxnZMRKgimpXX6KE0', 'kopenhagen-shopping-3-americas-cuiaba-507cd4cb'),
  ('d8c84394-2a2c-5bdf-adf2-402c00259f87'::uuid, 'ChIJA7n7YSuxnZMR_1SRKIXev8s', 'maison-paris-cuiaba-d8c84394'),
  ('2795da10-8404-51c7-b4c0-8b9bdcb305e4'::uuid, 'ChIJt8LAhsCxnZMRayIdR1qjjB4', 'mafia-pizzaria-cuiaba-2795da10'),
  ('3cb67d58-861b-51b2-a95b-59d5d2d08a0f'::uuid, 'ChIJZc0hQNixnZMRcGUxRelua-A', 'pizzarazzo-cuiaba-cuiaba-3cb67d58'),
  ('f5cff15f-b957-5902-b309-418d4d828d40'::uuid, 'ChIJEwSFTFixnZMRDBmiow_hQ6c', 'quintal-gastrobar-cuiaba-f5cff15f'),
  ('218103c8-80cf-5c97-a7f4-905ec110754f'::uuid, 'ChIJ9es77dqxnZMRzSaM2ec_cs4', 'ritorna-pizzaria-cuiaba-218103c8'),
  ('c1ba3ae1-d1fd-5812-ba3e-f88f54e8d824'::uuid, 'ChIJ8bNzyLOxnZMRrEtQLXioU0U', 'rock-amor-e-pizza-cuiaba-c1ba3ae1'),
  ('04970fb3-67b7-5218-8f54-982937496099'::uuid, 'ChIJq6qqao-xnZMRMPhzMH_yk4g', 'seu-majo-24-de-outubro-cuiaba-04970fb3'),
  ('3abfa8f3-e146-5493-b10a-25d785bdd5d5'::uuid, 'ChIJf-qF5YmxnZMR7ZwO6vpLne4', 'seu-majo-jd-das-americas-cuiaba-3abfa8f3'),
  ('3db1cd0f-4f0e-5b8c-9c7c-a39910a0014d'::uuid, 'ChIJBX_sM4OxnZMRvb5USgouae8', 'vila-sushi-cuiaba-3db1cd0f')
) SELECT b.*,r.id AS existing_id,r.name,r.status,r.google_place_id FROM batch b JOIN public.restaurants r ON r.id=b.id OR r.google_place_id=b.place_id OR r.slug=b.slug;
-- Zero rows expected for the prior collision SELECT. Secondary matching must also rerun over every catalog row.
ROLLBACK;
