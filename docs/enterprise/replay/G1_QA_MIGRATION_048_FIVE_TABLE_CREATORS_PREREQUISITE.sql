-- G1 QA-only structural source prerequisites for historical replay step 48.
-- This is NOT production SQL. Requires existing empty QA and an outer BEGIN/ROLLBACK.
-- Creator statements copied from reviewed historical migration sources. No customer data.
-- DO NOT deploy as migration or patch production history.

DO $g1_missing_tables_guard$
BEGIN
 IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM storage.objects) THEN
   RAISE EXCEPTION 'QA48 structural prerequisites require empty isolated QA';
 END IF;
 IF to_regclass('public.organizations') IS NULL OR to_regclass('public.ai_systems') IS NULL THEN
   RAISE EXCEPTION 'QA48 predecessor schema missing';
 END IF;
 IF to_regclass('public.audit_events') IS NOT NULL THEN RAISE EXCEPTION 'QA48 refuses to overwrite table audit_events'; END IF;
 IF to_regclass('public.notifications') IS NOT NULL THEN RAISE EXCEPTION 'QA48 refuses to overwrite table notifications'; END IF;
 IF to_regclass('public.onboarding_activation_runs') IS NOT NULL THEN RAISE EXCEPTION 'QA48 refuses to overwrite table onboarding_activation_runs'; END IF;
 IF to_regclass('public.monitoring_preferences') IS NOT NULL THEN RAISE EXCEPTION 'QA48 refuses to overwrite table monitoring_preferences'; END IF;
 IF to_regclass('public.regulatory_updates') IS NOT NULL THEN RAISE EXCEPTION 'QA48 refuses to overwrite table regulatory_updates'; END IF;
END $g1_missing_tables_guard$;

-- Reviewed source: supabase/migrations/20260610_public_launch_readiness.sql
-- GitHub blob SHA: b500e8216820aedab55776cd6c672a50855c7fec
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.audit_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.audit_events TO service_role;

-- Reviewed source: supabase/migrations/20260610_public_launch_readiness.sql
-- GitHub blob SHA: b500e8216820aedab55776cd6c672a50855c7fec
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid,
  title text not null,
  message text not null,
  type text not null default 'info',
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('info', 'success', 'warning', 'error'))
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

-- Reviewed source: supabase/migrations/20260629100000_b2b_onboarding_activation_flow.sql
-- GitHub blob SHA: be93d8a81488e4815889bc95d75e858eea2cbef9
create table if not exists public.onboarding_activation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_by_clerk_user_id text,
  country text not null,
  company_type text not null,
  sector text not null,
  ai_usage_level text not null,
  ai_usage_summary text,
  first_ai_system_id uuid references public.ai_systems(id) on delete set null,
  initial_risk_level text not null,
  readiness_score integer not null default 0,
  recommended_documents jsonb not null default '[]'::jsonb,
  suggested_tasks jsonb not null default '[]'::jsonb,
  invited_emails jsonb not null default '[]'::jsonb,
  selected_plan text not null default 'trial',
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

ALTER TABLE public.onboarding_activation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_activation_runs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.onboarding_activation_runs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.onboarding_activation_runs TO service_role;

-- Reviewed source: supabase/migrations/20260624170500_live_rls_validation_policy_patch.sql
-- GitHub blob SHA: 3436af8c702d2d4baaa017eee9b5df57237cb807
create table if not exists public.monitoring_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  regulatory_change_alerts boolean not null default true,
  monthly_review_reminders boolean not null default true,
  low_score_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

ALTER TABLE public.monitoring_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_preferences FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.monitoring_preferences FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.monitoring_preferences TO service_role;

-- Reviewed source: supabase/migrations/20260624170500_live_rls_validation_policy_patch.sql
-- GitHub blob SHA: 3436af8c702d2d4baaa017eee9b5df57237cb807
create table if not exists public.regulatory_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  severity text not null default 'medium',
  source_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.regulatory_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_updates FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.regulatory_updates FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.regulatory_updates TO service_role;

DO $g1_missing_tables_post$
DECLARE missing int;
BEGIN
 SELECT count(*) INTO missing FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('audit_events','notifications','onboarding_activation_runs','monitoring_preferences','regulatory_updates') AND c.relkind='r'
 AND c.relrowsecurity AND c.relforcerowsecurity;
 IF missing<>5 THEN RAISE EXCEPTION 'QA48 5/5 reviewed structural prerequisites were not secured'; END IF;
 IF has_table_privilege('anon','public.audit_events','SELECT') OR has_table_privilege('authenticated','public.audit_events','SELECT') THEN RAISE EXCEPTION 'QA48 unexpected client privilege on audit_events'; END IF;
 IF has_table_privilege('anon','public.notifications','SELECT') OR has_table_privilege('authenticated','public.notifications','SELECT') THEN RAISE EXCEPTION 'QA48 unexpected client privilege on notifications'; END IF;
 IF has_table_privilege('anon','public.onboarding_activation_runs','SELECT') OR has_table_privilege('authenticated','public.onboarding_activation_runs','SELECT') THEN RAISE EXCEPTION 'QA48 unexpected client privilege on onboarding_activation_runs'; END IF;
 IF has_table_privilege('anon','public.monitoring_preferences','SELECT') OR has_table_privilege('authenticated','public.monitoring_preferences','SELECT') THEN RAISE EXCEPTION 'QA48 unexpected client privilege on monitoring_preferences'; END IF;
 IF has_table_privilege('anon','public.regulatory_updates','SELECT') OR has_table_privilege('authenticated','public.regulatory_updates','SELECT') THEN RAISE EXCEPTION 'QA48 unexpected client privilege on regulatory_updates'; END IF;
END $g1_missing_tables_post$;
-- NO COMMIT. Controlling QA transaction MUST ROLLBACK.
