-- Smart Mess Manager - September 2026 historical import
-- Source: the September2026 sheet screenshot supplied by the project owner.
-- Safe to re-run: rows from this import batch are replaced, not duplicated.
-- Target workspace: Bachelor Next. Change v_target_mess_name only if your mess name differs.
--
-- Imported totals verified from the sheet:
--   Total meals   = 229.85
--   Total deposit = 12,574 BDT
--   Total bazar   = 13,265 BDT
--   Meal rate     = 13,265 / 229.85 = 57.71155... BDT
--
-- The sheet shows 26 bazar purchase amounts but no transaction dates. To avoid inventing
-- dates, this import stores the bazar as one September aggregate record. Monthly totals and
-- settlement calculations therefore remain exact.

begin;

do $$
declare
  v_target_mess_name text := 'Bachelor Next';
  v_batch text := 'september-2026-sheet-v1';
  v_mess_id uuid;
  v_state jsonb;
  v_now text := to_char((now() at time zone 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  v_ashraful text;
  v_shahajalal text;
  v_udoy text;
  v_rajib text;
  v_diganto text;
  v_redowan text;
  v_dibbo text;
  v_emon text;
  v_member_id text;

  v_meal_source jsonb := $json$[{"member_key":"ashraful","meal_date":"2026-09-01","meal_count":1},{"member_key":"rajib","meal_date":"2026-09-01","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-01","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-01","meal_count":1},{"member_key":"emon","meal_date":"2026-09-01","meal_count":1},{"member_key":"ashraful","meal_date":"2026-09-02","meal_count":1},{"member_key":"shahajalal","meal_date":"2026-09-02","meal_count":2},{"member_key":"rajib","meal_date":"2026-09-02","meal_count":1},{"member_key":"diganto","meal_date":"2026-09-02","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-02","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-02","meal_count":1},{"member_key":"emon","meal_date":"2026-09-02","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-03","meal_count":2},{"member_key":"shahajalal","meal_date":"2026-09-03","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-03","meal_count":1},{"member_key":"rajib","meal_date":"2026-09-03","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-03","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-03","meal_count":2},{"member_key":"dibbo","meal_date":"2026-09-03","meal_count":1},{"member_key":"emon","meal_date":"2026-09-03","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-04","meal_count":2},{"member_key":"shahajalal","meal_date":"2026-09-04","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-04","meal_count":2},{"member_key":"rajib","meal_date":"2026-09-04","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-04","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-04","meal_count":2},{"member_key":"emon","meal_date":"2026-09-04","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-05","meal_count":2},{"member_key":"shahajalal","meal_date":"2026-09-05","meal_count":2},{"member_key":"udoy","meal_date":"2026-09-05","meal_count":1},{"member_key":"rajib","meal_date":"2026-09-05","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-05","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-05","meal_count":2},{"member_key":"dibbo","meal_date":"2026-09-05","meal_count":1},{"member_key":"emon","meal_date":"2026-09-05","meal_count":1},{"member_key":"shahajalal","meal_date":"2026-09-06","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-06","meal_count":1},{"member_key":"rajib","meal_date":"2026-09-06","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-06","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-06","meal_count":2},{"member_key":"dibbo","meal_date":"2026-09-06","meal_count":1},{"member_key":"emon","meal_date":"2026-09-06","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-07","meal_count":0.75},{"member_key":"udoy","meal_date":"2026-09-07","meal_count":1},{"member_key":"rajib","meal_date":"2026-09-07","meal_count":7},{"member_key":"diganto","meal_date":"2026-09-07","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-07","meal_count":2},{"member_key":"dibbo","meal_date":"2026-09-07","meal_count":1},{"member_key":"emon","meal_date":"2026-09-07","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-08","meal_count":1.25},{"member_key":"udoy","meal_date":"2026-09-08","meal_count":0.25},{"member_key":"redowan","meal_date":"2026-09-08","meal_count":1.25},{"member_key":"dibbo","meal_date":"2026-09-08","meal_count":0.25},{"member_key":"emon","meal_date":"2026-09-08","meal_count":1.25},{"member_key":"ashraful","meal_date":"2026-09-09","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-09","meal_count":1},{"member_key":"diganto","meal_date":"2026-09-09","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-09","meal_count":2},{"member_key":"dibbo","meal_date":"2026-09-09","meal_count":1},{"member_key":"emon","meal_date":"2026-09-09","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-10","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-10","meal_count":1},{"member_key":"diganto","meal_date":"2026-09-10","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-10","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-10","meal_count":1},{"member_key":"emon","meal_date":"2026-09-10","meal_count":1},{"member_key":"ashraful","meal_date":"2026-09-11","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-11","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-11","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-11","meal_count":2},{"member_key":"dibbo","meal_date":"2026-09-11","meal_count":1},{"member_key":"emon","meal_date":"2026-09-11","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-12","meal_count":2},{"member_key":"udoy","meal_date":"2026-09-12","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-12","meal_count":2},{"member_key":"redowan","meal_date":"2026-09-12","meal_count":3},{"member_key":"dibbo","meal_date":"2026-09-12","meal_count":1},{"member_key":"emon","meal_date":"2026-09-12","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-13","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-13","meal_count":1},{"member_key":"diganto","meal_date":"2026-09-13","meal_count":1},{"member_key":"redowan","meal_date":"2026-09-13","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-13","meal_count":1},{"member_key":"emon","meal_date":"2026-09-13","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-14","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-14","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-14","meal_count":1},{"member_key":"emon","meal_date":"2026-09-14","meal_count":1},{"member_key":"ashraful","meal_date":"2026-09-15","meal_count":1},{"member_key":"diganto","meal_date":"2026-09-15","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-15","meal_count":1},{"member_key":"emon","meal_date":"2026-09-15","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-16","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-16","meal_count":1},{"member_key":"diganto","meal_date":"2026-09-16","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-16","meal_count":6.6},{"member_key":"emon","meal_date":"2026-09-16","meal_count":1},{"member_key":"ashraful","meal_date":"2026-09-17","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-17","meal_count":1},{"member_key":"diganto","meal_date":"2026-09-17","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-17","meal_count":5},{"member_key":"emon","meal_date":"2026-09-17","meal_count":1},{"member_key":"ashraful","meal_date":"2026-09-18","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-18","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-18","meal_count":0.25},{"member_key":"dibbo","meal_date":"2026-09-18","meal_count":1},{"member_key":"emon","meal_date":"2026-09-18","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-19","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-19","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-20","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-20","meal_count":1},{"member_key":"ashraful","meal_date":"2026-09-21","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-21","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-21","meal_count":1},{"member_key":"emon","meal_date":"2026-09-21","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-22","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-22","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-22","meal_count":1},{"member_key":"emon","meal_date":"2026-09-22","meal_count":1},{"member_key":"ashraful","meal_date":"2026-09-23","meal_count":2},{"member_key":"udoy","meal_date":"2026-09-23","meal_count":1},{"member_key":"rajib","meal_date":"2026-09-23","meal_count":0.25},{"member_key":"emon","meal_date":"2026-09-23","meal_count":1},{"member_key":"ashraful","meal_date":"2026-09-24","meal_count":2},{"member_key":"rajib","meal_date":"2026-09-24","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-24","meal_count":0.25},{"member_key":"dibbo","meal_date":"2026-09-24","meal_count":1},{"member_key":"emon","meal_date":"2026-09-24","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-25","meal_count":1},{"member_key":"rajib","meal_date":"2026-09-25","meal_count":2},{"member_key":"dibbo","meal_date":"2026-09-25","meal_count":1},{"member_key":"emon","meal_date":"2026-09-25","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-26","meal_count":2},{"member_key":"udoy","meal_date":"2026-09-26","meal_count":2},{"member_key":"rajib","meal_date":"2026-09-26","meal_count":2},{"member_key":"dibbo","meal_date":"2026-09-26","meal_count":1},{"member_key":"emon","meal_date":"2026-09-26","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-27","meal_count":1},{"member_key":"udoy","meal_date":"2026-09-27","meal_count":1},{"member_key":"rajib","meal_date":"2026-09-27","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-27","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-27","meal_count":2},{"member_key":"emon","meal_date":"2026-09-27","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-28","meal_count":2},{"member_key":"udoy","meal_date":"2026-09-28","meal_count":1},{"member_key":"rajib","meal_date":"2026-09-28","meal_count":1},{"member_key":"diganto","meal_date":"2026-09-28","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-28","meal_count":0.25},{"member_key":"emon","meal_date":"2026-09-28","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-29","meal_count":2},{"member_key":"udoy","meal_date":"2026-09-29","meal_count":0.25},{"member_key":"rajib","meal_date":"2026-09-29","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-29","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-29","meal_count":1},{"member_key":"emon","meal_date":"2026-09-29","meal_count":2},{"member_key":"ashraful","meal_date":"2026-09-30","meal_count":2},{"member_key":"udoy","meal_date":"2026-09-30","meal_count":1},{"member_key":"rajib","meal_date":"2026-09-30","meal_count":2},{"member_key":"diganto","meal_date":"2026-09-30","meal_count":1},{"member_key":"dibbo","meal_date":"2026-09-30","meal_count":1},{"member_key":"emon","meal_date":"2026-09-30","meal_count":2}]$json$::jsonb;
  v_deposit_source jsonb := $json$[{"member_key":"ashraful","amount":2150},{"member_key":"shahajalal","amount":500},{"member_key":"udoy","amount":2114},{"member_key":"rajib","amount":1740},{"member_key":"diganto","amount":1280},{"member_key":"redowan","amount":700},{"member_key":"dibbo","amount":1900},{"member_key":"emon","amount":2190}]$json$::jsonb;
  v_meal_rows jsonb := '[]'::jsonb;
  v_deposit_rows jsonb := '[]'::jsonb;
  v_market_rows jsonb := '[]'::jsonb;
  v_activity_rows jsonb := '[]'::jsonb;
  rec record;
begin
  select id, state
    into v_mess_id, v_state
  from public.mess_workspaces
  where name = v_target_mess_name
  order by updated_at desc
  limit 1;

  if v_mess_id is null then
    raise exception 'Mess workspace "%" was not found. Change v_target_mess_name at the top of this script.', v_target_mess_name;
  end if;

  if v_state is null or jsonb_typeof(v_state) <> 'object' then
    raise exception 'The workspace state is missing or invalid.';
  end if;

  -- Resolve current members using tolerant aliases so the import survives display-name formatting.
  select m->>'id' into v_ashraful
  from jsonb_array_elements(coalesce(v_state->'members','[]'::jsonb)) m
  where regexp_replace(lower(coalesce(m->>'name','')), '[^a-z0-9]+', '', 'g') in ('ashrafulislam','mdashrafulislam')
  limit 1;

  select m->>'id' into v_udoy
  from jsonb_array_elements(coalesce(v_state->'members','[]'::jsonb)) m
  where regexp_replace(lower(coalesce(m->>'name','')), '[^a-z0-9]+', '', 'g') in ('udoy','udoychowdhury')
  limit 1;

  select m->>'id' into v_rajib
  from jsonb_array_elements(coalesce(v_state->'members','[]'::jsonb)) m
  where regexp_replace(lower(coalesce(m->>'name','')), '[^a-z0-9]+', '', 'g') in ('rajib','mdrajib')
  limit 1;

  select m->>'id' into v_redowan
  from jsonb_array_elements(coalesce(v_state->'members','[]'::jsonb)) m
  where regexp_replace(lower(coalesce(m->>'name','')), '[^a-z0-9]+', '', 'g') in ('redowan','redowanhossain','mdredowanhossain')
  limit 1;

  select m->>'id' into v_dibbo
  from jsonb_array_elements(coalesce(v_state->'members','[]'::jsonb)) m
  where regexp_replace(lower(coalesce(m->>'name','')), '[^a-z0-9]+', '', 'g') in ('dibbo','dibboroy')
  limit 1;

  select m->>'id' into v_emon
  from jsonb_array_elements(coalesce(v_state->'members','[]'::jsonb)) m
  where regexp_replace(lower(coalesce(m->>'name','')), '[^a-z0-9]+', '', 'g') in ('emon','emonroy')
  limit 1;

  if v_ashraful is null or v_udoy is null or v_rajib is null or v_redowan is null or v_dibbo is null or v_emon is null then
    raise exception 'One or more current members could not be matched. Required aliases: Ashraful, Udoy, Rajib, Redowan, Dibbo, Emon.';
  end if;

  -- Shahajalal and Diganto existed in September but are no longer in the current member list.
  -- Keep them as archived historical members so September reports retain their names and totals.
  select m->>'id' into v_shahajalal
  from jsonb_array_elements(coalesce(v_state->'members','[]'::jsonb)) m
  where regexp_replace(lower(coalesce(m->>'name','')), '[^a-z0-9]+', '', 'g') = 'shahajalal'
  limit 1;

  if v_shahajalal is null then
    v_shahajalal := 'historical-shahajalal-2026-09';
    v_state := jsonb_set(
      v_state,
      '{members}',
      coalesce(v_state->'members','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', v_shahajalal,
        'messId', v_mess_id::text,
        'userId', null,
        'name', 'Shahajalal',
        'email', '',
        'phone', '',
        'roomNo', '',
        'role', 'member',
        'joinDate', '2026-09-01',
        'status', 'inactive',
        'mealStatus', 'active',
        'autoMealSuspended', false,
        'dueSince', null,
        'paymentWarningSentAt', null,
        'mealSuspendedAt', null,
        'archived', true,
        'historical', true
      )),
      true
    );
  end if;

  select m->>'id' into v_diganto
  from jsonb_array_elements(coalesce(v_state->'members','[]'::jsonb)) m
  where regexp_replace(lower(coalesce(m->>'name','')), '[^a-z0-9]+', '', 'g') in ('diganto','diganta')
  limit 1;

  if v_diganto is null then
    v_diganto := 'historical-diganto-2026-09';
    v_state := jsonb_set(
      v_state,
      '{members}',
      coalesce(v_state->'members','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', v_diganto,
        'messId', v_mess_id::text,
        'userId', null,
        'name', 'Diganto',
        'email', '',
        'phone', '',
        'roomNo', '',
        'role', 'member',
        'joinDate', '2026-09-01',
        'status', 'inactive',
        'mealStatus', 'active',
        'autoMealSuspended', false,
        'dueSince', null,
        'paymentWarningSentAt', null,
        'mealSuspendedAt', null,
        'archived', true,
        'historical', true
      )),
      true
    );
  end if;

  -- Remove only rows created by an earlier run of this same import batch.
  v_state := jsonb_set(v_state, '{meals}', coalesce((
    select jsonb_agg(item) from jsonb_array_elements(coalesce(v_state->'meals','[]'::jsonb)) item
    where coalesce(item->>'importBatch','') <> v_batch
  ), '[]'::jsonb), true);

  v_state := jsonb_set(v_state, '{deposits}', coalesce((
    select jsonb_agg(item) from jsonb_array_elements(coalesce(v_state->'deposits','[]'::jsonb)) item
    where coalesce(item->>'importBatch','') <> v_batch
  ), '[]'::jsonb), true);

  v_state := jsonb_set(v_state, '{marketCosts}', coalesce((
    select jsonb_agg(item) from jsonb_array_elements(coalesce(v_state->'marketCosts','[]'::jsonb)) item
    where coalesce(item->>'importBatch','') <> v_batch
  ), '[]'::jsonb), true);

  v_state := jsonb_set(v_state, '{activityLogs}', coalesce((
    select jsonb_agg(item) from jsonb_array_elements(coalesce(v_state->'activityLogs','[]'::jsonb)) item
    where coalesce(item->>'importBatch','') <> v_batch
  ), '[]'::jsonb), true);

  -- Convert the spreadsheet's per-day total meal counts into app meal rows.
  -- We place the historical total in the lunch field; breakfast/dinner stay zero.
  for rec in
    select * from jsonb_to_recordset(v_meal_source)
      as x(member_key text, meal_date date, meal_count numeric)
  loop
    v_member_id := case rec.member_key
      when 'ashraful' then v_ashraful
      when 'shahajalal' then v_shahajalal
      when 'udoy' then v_udoy
      when 'rajib' then v_rajib
      when 'diganto' then v_diganto
      when 'redowan' then v_redowan
      when 'dibbo' then v_dibbo
      when 'emon' then v_emon
      else null
    end;

    v_meal_rows := v_meal_rows || jsonb_build_array(jsonb_build_object(
      'id', format('import-2026-09-meal-%s-%s', rec.member_key, to_char(rec.meal_date,'DD')),
      'messId', v_mess_id::text,
      'memberId', v_member_id,
      'mealDate', to_char(rec.meal_date,'YYYY-MM-DD'),
      'breakfast', 0,
      'lunch', rec.meal_count,
      'dinner', 0,
      'note', 'Imported historical total meal count from September 2026 sheet',
      'importBatch', v_batch
    ));
  end loop;

  for rec in
    select * from jsonb_to_recordset(v_deposit_source)
      as x(member_key text, amount numeric)
  loop
    v_member_id := case rec.member_key
      when 'ashraful' then v_ashraful
      when 'shahajalal' then v_shahajalal
      when 'udoy' then v_udoy
      when 'rajib' then v_rajib
      when 'diganto' then v_diganto
      when 'redowan' then v_redowan
      when 'dibbo' then v_dibbo
      when 'emon' then v_emon
      else null
    end;

    v_deposit_rows := v_deposit_rows || jsonb_build_array(jsonb_build_object(
      'id', format('import-2026-09-deposit-%s', rec.member_key),
      'messId', v_mess_id::text,
      'memberId', v_member_id,
      'depositDate', '2026-09-30',
      'amount', rec.amount,
      'paymentMethod', 'Historical import',
      'note', 'September 2026 aggregate deposit imported from sheet',
      'importBatch', v_batch
    ));
  end loop;

  v_market_rows := jsonb_build_array(jsonb_build_object(
    'id', 'import-2026-09-market-total',
    'messId', v_mess_id::text,
    'buyerMemberId', v_ashraful,
    'costDate', '2026-09-30',
    'amount', 13265,
    'items', 'September 2026 bazar total',
    'note', 'Imported aggregate from 26 sheet entries; original transaction dates were not present',
    'importBatch', v_batch
  ));

  v_activity_rows := jsonb_build_array(jsonb_build_object(
    'id', 'import-2026-09-activity',
    'messId', v_mess_id::text,
    'actorName', 'Historical import',
    'action', 'Imported September 2026 meals, deposits, and bazar totals',
    'createdAt', v_now,
    'importBatch', v_batch
  ));

  v_state := jsonb_set(v_state, '{meals}', coalesce(v_state->'meals','[]'::jsonb) || v_meal_rows, true);
  v_state := jsonb_set(v_state, '{deposits}', coalesce(v_state->'deposits','[]'::jsonb) || v_deposit_rows, true);
  v_state := jsonb_set(v_state, '{marketCosts}', coalesce(v_state->'marketCosts','[]'::jsonb) || v_market_rows, true);
  v_state := jsonb_set(v_state, '{activityLogs}', coalesce(v_state->'activityLogs','[]'::jsonb) || v_activity_rows, true);

  v_state := jsonb_set(
    v_state,
    '{syncMeta}',
    coalesce(v_state->'syncMeta','{}'::jsonb) || jsonb_build_object(
      'updatedAt', v_now,
      'lastSyncedAt', v_now,
      'lastSyncSource', 'supabase-import',
      'pendingSync', false
    ),
    true
  );

  update public.mess_workspaces
  set state = v_state
  where id = v_mess_id;
end $$;

-- Verification. Expected: 229.85 meals, 12,574 deposits, 13,265 bazar.
with target as (
  select state
  from public.mess_workspaces
  where name = 'Bachelor Next'
  order by updated_at desc
  limit 1
),
meal_rows as (
  select (m->>'lunch')::numeric as amount
  from target, jsonb_array_elements(coalesce(state->'meals','[]'::jsonb)) m
  where m->>'importBatch' = 'september-2026-sheet-v1'
),
deposit_rows as (
  select (d->>'amount')::numeric as amount
  from target, jsonb_array_elements(coalesce(state->'deposits','[]'::jsonb)) d
  where d->>'importBatch' = 'september-2026-sheet-v1'
),
market_rows as (
  select (b->>'amount')::numeric as amount
  from target, jsonb_array_elements(coalesce(state->'marketCosts','[]'::jsonb)) b
  where b->>'importBatch' = 'september-2026-sheet-v1'
)
select
  (select coalesce(sum(amount),0) from meal_rows) as imported_total_meals,
  (select coalesce(sum(amount),0) from deposit_rows) as imported_total_deposits,
  (select coalesce(sum(amount),0) from market_rows) as imported_total_bazar,
  round((select coalesce(sum(amount),0) from market_rows) / nullif((select coalesce(sum(amount),0) from meal_rows),0), 4) as imported_meal_rate;

commit;
