-- G1 QA-only missing source-lineage column reconciliation for historical migration #37.
-- Original production ledger and main migration untouched. Source blob 37f2936e8ab0fdec7da6f4621f1ea8a7792763db.
-- Fail closed on any existing subscriptions; caller must enclose in BEGIN/ROLLBACK and target isolated QA.



-- Forward-only schema reconciliation for the canonical billing plans used by
-- src/lib/billing/plans.ts. Existing subscription row values are not rewritten.
-- QA-only prerequisite for a schema-only replay where early production creator migrations are omitted.
DO $g1_qa37_missing_columns$
BEGIN
  IF to_regclass('public.subscriptions') IS NULL THEN
    RAISE EXCEPTION 'G1 QA37 subscription creator missing';
  END IF;
  IF EXISTS (SELECT 1 FROM public.subscriptions) THEN
    RAISE EXCEPTION 'G1 QA37 not permitted with customer or synthetic subscription rows';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='tier'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN tier text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='entitlements'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN entitlements jsonb;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions'
      AND ((column_name='tier' AND udt_name<>'text') OR (column_name='entitlements' AND udt_name<>'jsonb'))
  ) THEN
    RAISE EXCEPTION 'G1 QA37 inconsistent column types';
  END IF;
END $g1_qa37_missing_columns$;

do $guard$
begin
  if to_regclass('public.subscriptions') is null then
    raise exception 'public.subscriptions must exist before subscription schema reconciliation';
  end if;

  if exists (
    select 1
    from public.subscriptions
    where plan not in ('starter', 'professional', 'business', 'enterprise')
       or tier is null
       or tier not in ('starter', 'professional', 'business', 'enterprise')
  ) then
    raise exception 'subscription rows must be canonically normalized before schema defaults are tightened';
  end if;
end
$guard$;

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check,
  drop constraint if exists subscriptions_tier_check;

alter table public.subscriptions
  alter column plan set default 'starter',
  alter column plan set not null,
  alter column tier set default 'starter',
  alter column tier set not null,
  alter column status set default 'inactive',
  alter column status set not null,
  alter column entitlements set default '{
    "users": 3,
    "documents": 100,
    "vendors": 5,
    "risks": 25,
    "organizations": 1,
    "aiSystems": 25,
    "storageGb": 10,
    "apiRequestsMonthly": 0,
    "webhooks": 0,
    "exportsMonthly": 25,
    "auditLogsDays": 30
  }'::jsonb,
  alter column entitlements set not null;

alter table public.subscriptions
  add constraint subscriptions_plan_check
    check (plan in ('starter', 'professional', 'business', 'enterprise')) not valid,
  add constraint subscriptions_tier_check
    check (tier in ('starter', 'professional', 'business', 'enterprise')) not valid;

alter table public.subscriptions validate constraint subscriptions_plan_check;
alter table public.subscriptions validate constraint subscriptions_tier_check;

create unique index if not exists subscriptions_organization_id_uidx
  on public.subscriptions (organization_id);

do $verify$
declare
  plan_default text;
  tier_default text;
  status_default text;
begin
  select pg_get_expr(d.adbin, d.adrelid)
    into plan_default
  from pg_attrdef d
  join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
  where d.adrelid = 'public.subscriptions'::regclass and a.attname = 'plan';

  select pg_get_expr(d.adbin, d.adrelid)
    into tier_default
  from pg_attrdef d
  join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
  where d.adrelid = 'public.subscriptions'::regclass and a.attname = 'tier';

  select pg_get_expr(d.adbin, d.adrelid)
    into status_default
  from pg_attrdef d
  join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
  where d.adrelid = 'public.subscriptions'::regclass and a.attname = 'status';

  if plan_default <> '''starter''::text'
     or tier_default <> '''starter''::text'
     or status_default <> '''inactive''::text' then
    raise exception 'subscription defaults did not reconcile to the canonical fail-closed contract';
  end if;
end
$verify$;


-- QA-only schema invariants after applying the original source migration 37.
DO $g1_qa37_postconditions$
DECLARE correct integer;
BEGIN
  SELECT COUNT(*) INTO correct FROM information_schema.columns
  WHERE table_schema='public' AND table_name='subscriptions'
    AND ((column_name='tier' AND udt_name='text' AND is_nullable='NO')
      OR (column_name='entitlements' AND udt_name='jsonb' AND is_nullable='NO'));
  IF correct<>2 THEN RAISE EXCEPTION 'G1 QA37 tier/entitlements not reconciled: %',correct; END IF;
END $g1_qa37_postconditions$;
