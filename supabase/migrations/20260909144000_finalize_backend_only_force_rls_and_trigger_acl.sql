begin;

-- Final bounded hardening observed from live read-only Production inspection.
-- Both tables are backend-only today: no anon/authenticated grants and no RLS
-- policies. FORCE RLS removes the remaining owner-path exception without
-- expanding any browser authority. service_role retains its intentional backend
-- privileges and bypass role semantics.
do $tables$
begin
  if to_regclass('public.linkedin_marketing_posts') is not null then
    alter table public.linkedin_marketing_posts enable row level security;
    alter table public.linkedin_marketing_posts force row level security;
    revoke all privileges on table public.linkedin_marketing_posts from anon, authenticated;
  end if;

  if to_regclass('public.waitlist_leads') is not null then
    alter table public.waitlist_leads enable row level security;
    alter table public.waitlist_leads force row level security;
    revoke all privileges on table public.waitlist_leads from anon, authenticated;
  end if;
end
$tables$;

-- Trigger functions do not need public/PostgREST invocation rights. The function
-- remains usable by its database trigger; this closes an unnecessary exposed
-- EXECUTE ACL without changing the trigger's mutation semantics.
do $trigger_acl$
begin
  if to_regprocedure('public.prevent_ai_qms_decision_mutation()') is not null then
    revoke execute on function public.prevent_ai_qms_decision_mutation() from public, anon, authenticated;
    grant execute on function public.prevent_ai_qms_decision_mutation() to service_role;
  end if;
end
$trigger_acl$;

-- Fail-closed postconditions.
do $verify$
begin
  if to_regclass('public.linkedin_marketing_posts') is not null and not exists (
    select 1
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='linkedin_marketing_posts'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'linkedin_marketing_posts FORCE RLS postcondition failed';
  end if;

  if to_regclass('public.waitlist_leads') is not null and not exists (
    select 1
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='waitlist_leads'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'waitlist_leads FORCE RLS postcondition failed';
  end if;

  if to_regclass('public.linkedin_marketing_posts') is not null and (
    has_table_privilege('anon','public.linkedin_marketing_posts','SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated','public.linkedin_marketing_posts','SELECT,INSERT,UPDATE,DELETE')
  ) then
    raise exception 'linkedin_marketing_posts browser privileges survived';
  end if;

  if to_regclass('public.waitlist_leads') is not null and (
    has_table_privilege('anon','public.waitlist_leads','SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated','public.waitlist_leads','SELECT,INSERT,UPDATE,DELETE')
  ) then
    raise exception 'waitlist_leads browser privileges survived';
  end if;

  if to_regprocedure('public.prevent_ai_qms_decision_mutation()') is not null and (
    has_function_privilege('anon','public.prevent_ai_qms_decision_mutation()','EXECUTE')
    or has_function_privilege('authenticated','public.prevent_ai_qms_decision_mutation()','EXECUTE')
  ) then
    raise exception 'prevent_ai_qms_decision_mutation browser EXECUTE privilege survived';
  end if;
end
$verify$;

commit;
