begin;

-- Reconcile the versioned ai_systems schema with the live canonical text[]
-- contract before the active onboarding RPC repair runs. Production already
-- uses text[] and therefore takes the no-op path. Clean resets/previews created
-- from the historical jsonb definition are converted forward without rewriting
-- migration history or discarding array ordering/duplicates.

create or replace function public.__risck_jsonb_string_array_to_text_array(p_value jsonb)
returns text[]
language sql
immutable
strict
set search_path = pg_catalog
as $helper$
  select coalesce(
    array_agg(element.value order by element.ordinality),
    '{}'::text[]
  )
  from pg_catalog.jsonb_array_elements_text(p_value)
    with ordinality as element(value, ordinality);
$helper$;

revoke all on function public.__risck_jsonb_string_array_to_text_array(jsonb)
  from public, anon, authenticated, service_role;

do $reconcile$
declare
  obligations_type text;
  next_actions_type text;
  invalid_rows boolean := false;
begin
  if to_regclass('public.ai_systems') is null then
    raise exception 'public.ai_systems must exist before text-array schema reconciliation';
  end if;

  select format_type(a.atttypid, a.atttypmod)
  into obligations_type
  from pg_attribute a
  where a.attrelid = 'public.ai_systems'::regclass
    and a.attname = 'obligations'
    and a.attnum > 0
    and not a.attisdropped;

  select format_type(a.atttypid, a.atttypmod)
  into next_actions_type
  from pg_attribute a
  where a.attrelid = 'public.ai_systems'::regclass
    and a.attname = 'next_actions'
    and a.attnum > 0
    and not a.attisdropped;

  if obligations_type not in ('jsonb', 'text[]')
     or next_actions_type not in ('jsonb', 'text[]') then
    raise exception
      'ai_systems obligations/next_actions must be jsonb or text[] before reconciliation (observed %, %)',
      obligations_type,
      next_actions_type;
  end if;

  if obligations_type = 'jsonb' then
    execute $sql$
      select exists (
        select 1
        from public.ai_systems as systems
        where pg_catalog.jsonb_typeof(systems.obligations) <> 'array'
           or exists (
             select 1
             from pg_catalog.jsonb_array_elements(systems.obligations) as element(value)
             where pg_catalog.jsonb_typeof(element.value) <> 'string'
           )
      )
    $sql$
    into invalid_rows;

    if invalid_rows then
      raise exception 'ai_systems.obligations contains non-array or non-string JSON values';
    end if;

    execute 'alter table public.ai_systems alter column obligations drop default';
    execute $sql$
      alter table public.ai_systems
        alter column obligations type text[]
        using public.__risck_jsonb_string_array_to_text_array(obligations)
    $sql$;
  end if;

  if next_actions_type = 'jsonb' then
    execute $sql$
      select exists (
        select 1
        from public.ai_systems as systems
        where pg_catalog.jsonb_typeof(systems.next_actions) <> 'array'
           or exists (
             select 1
             from pg_catalog.jsonb_array_elements(systems.next_actions) as element(value)
             where pg_catalog.jsonb_typeof(element.value) <> 'string'
           )
      )
    $sql$
    into invalid_rows;

    if invalid_rows then
      raise exception 'ai_systems.next_actions contains non-array or non-string JSON values';
    end if;

    execute 'alter table public.ai_systems alter column next_actions drop default';
    execute $sql$
      alter table public.ai_systems
        alter column next_actions type text[]
        using public.__risck_jsonb_string_array_to_text_array(next_actions)
    $sql$;
  end if;

  alter table public.ai_systems
    alter column obligations set default '{}'::text[],
    alter column next_actions set default '{}'::text[];
end
$reconcile$;

drop function public.__risck_jsonb_string_array_to_text_array(jsonb);

do $verify$
declare
  obligations_type text;
  next_actions_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
  into obligations_type
  from pg_attribute a
  where a.attrelid = 'public.ai_systems'::regclass
    and a.attname = 'obligations'
    and a.attnum > 0
    and not a.attisdropped;

  select format_type(a.atttypid, a.atttypmod)
  into next_actions_type
  from pg_attribute a
  where a.attrelid = 'public.ai_systems'::regclass
    and a.attname = 'next_actions'
    and a.attnum > 0
    and not a.attisdropped;

  if obligations_type is distinct from 'text[]'
     or next_actions_type is distinct from 'text[]' then
    raise exception 'ai_systems text-array schema reconciliation did not converge';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
commit;
