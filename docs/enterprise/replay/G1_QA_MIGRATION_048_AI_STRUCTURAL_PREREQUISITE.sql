-- G1 QA-only precondition for source-replay migration index 48.
-- Original creator source ai_governance_inventory.sql, blob daed73d8f6a11e7938c9e7753d13e39e41698766.
-- Original creator source ai_incident_register.sql, blob b5db5f35792048714fd3fede2e3e1d3ad70eb0bd.
-- Extract ONLY table DDL, NOT historical permissive client policies or trigger functions.
-- No customer data and never use as production migration. Mandatory outer ROLLBACK.

DO $g1_48_pre$
BEGIN
 IF to_regclass('public.ai_systems') IS NOT NULL OR to_regclass('public.ai_incidents') IS NOT NULL THEN
   RAISE EXCEPTION 'G1 QA48 existing AI table must not be overwritten';
 END IF;
END $g1_48_pre$;

create table if not exists public.ai_systems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  owner_team text,
  vendor_name text,
  use_case text not null,
  role text not null default 'deployer' check (role in ('provider', 'deployer', 'importer', 'distributor', 'other')),
  lifecycle_status text not null default 'planned' check (lifecycle_status in ('planned', 'pilot', 'production', 'retired')),
  risk_domain text not null default 'general_productivity',
  uses_personal_data boolean not null default false,
  interacts_with_people boolean not null default false,
  generates_content boolean not null default false,
  biometric_identification boolean not null default false,
  manipulative_or_exploitative boolean not null default false,
  risk_level text not null default 'minimal_or_low' check (risk_level in ('prohibited_review', 'high_risk_review', 'limited_transparency', 'minimal_or_low')),
  classification_summary text not null default '',
  obligations jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ai_system_id uuid references public.ai_systems(id) on delete set null,
  title text not null,
  summary text not null,
  category text not null default 'other' check (category in ('malfunction', 'data_or_security', 'serious_harm', 'fundamental_rights', 'transparency_failure', 'prohibited_use_signal', 'other')),
  severity text not null default 'monitor' check (severity in ('monitor', 'serious', 'critical')),
  detected_at timestamptz not null default now(),
  report_status text not null default 'draft' check (report_status in ('draft', 'assessing', 'reportable', 'reported', 'closed')),
  authority text,
  internal_owner text,
  deadline_plan jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.ai_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_systems FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_incidents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_systems,public.ai_incidents FROM PUBLIC,anon,authenticated;

DO $g1_48_denial$
DECLARE num int;
BEGIN
 SELECT COUNT(*) INTO num FROM pg_policies WHERE schemaname='public' AND tablename IN ('ai_systems','ai_incidents');
 IF num<>0 THEN RAISE EXCEPTION 'G1 QA48 unexpected unsafe legacy policies %',num; END IF;
 SELECT COUNT(*) INTO num FROM pg_class c WHERE c.oid IN (to_regclass('public.ai_systems'),to_regclass('public.ai_incidents'))
 AND c.relrowsecurity AND c.relforcerowsecurity;
 IF num<>2 THEN RAISE EXCEPTION 'G1 QA48 missing RLS/FORCE protection'; END IF;
 IF has_table_privilege('anon','public.ai_systems','SELECT') OR has_table_privilege('authenticated','public.ai_incidents','INSERT') THEN
  RAISE EXCEPTION 'G1 QA48 unintended client grants';
 END IF;
END $g1_48_denial$;
