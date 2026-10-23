-- G1 QA-ONLY precondition for historical migration 39, version 20260822123546.
-- Missing creator from production-ledger replay lineage: source 20260624220000 (blob 6845b942046019a5ad9191276b9c110faa9c5b90).
-- Canonical task RLS policy chain from 20260809135000 (blob ff15730715ac2631ed4b0b2ff002424cd291fada).
-- Production current read-only schema confirms 8-column minimal tasks shape.
-- Fails closed if tasks already exists or when app_private tenant helpers are absent.
-- DO NOT USE AS A PRODUCTION MIGRATION. Enclose in test transaction + ROLLBACK.

DO $g1_no_existing_tasks$
BEGIN
 IF to_regclass('public.tasks') IS NOT NULL THEN
   RAISE EXCEPTION 'G1 QA39 refuses to overwrite an existing tasks table';
 END IF;
 IF to_regprocedure('app_private.is_org_member(uuid)') IS NULL
   OR to_regprocedure('app_private.has_org_role(uuid,text[])') IS NULL THEN
   RAISE EXCEPTION 'G1 QA39 private tenant helpers not ready';
 END IF;
END $g1_no_existing_tasks$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  created_by uuid,
  assigned_to uuid,
  title text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tasks FROM PUBLIC, anon, authenticated;

-- Exact canonical scoped task policies; source provenance pinned above.
create policy rls_tasks_select_member
  on public.tasks for select to authenticated
  using (app_private.is_org_member(organization_id));
create policy rls_tasks_insert_writer
  on public.tasks for insert to authenticated
  with check (app_private.has_org_role(organization_id, array['owner','admin','editor','compliance_manager']));
create policy rls_tasks_update_writer
  on public.tasks for update to authenticated
  using (app_private.has_org_role(organization_id, array['owner','admin','editor','compliance_manager']))
  with check (app_private.has_org_role(organization_id, array['owner','admin','editor','compliance_manager']));
create policy rls_tasks_delete_admin
  on public.tasks for delete to authenticated
  using (app_private.has_org_role(organization_id, array['owner','admin']));


DO $g1_task_policy_postconditions$
DECLARE n int;
BEGIN
 SELECT COUNT(*) INTO n FROM pg_policies WHERE schemaname='public' AND tablename='tasks'
   AND policyname IN ('rls_tasks_select_member','rls_tasks_insert_writer','rls_tasks_update_writer','rls_tasks_delete_admin')
   AND 'authenticated'=ANY(roles);
 IF n<>4 THEN RAISE EXCEPTION 'G1 QA39 canonical task policy set incomplete: %',n; END IF;
 SELECT COUNT(*) INTO n FROM information_schema.columns
 WHERE table_schema='public' AND table_name='tasks';
 IF n<>8 THEN RAISE EXCEPTION 'G1 QA39 minimal task schema diverged from production: %',n; END IF;
 IF has_table_privilege('anon','public.tasks','SELECT')
    OR has_table_privilege('authenticated','public.tasks','INSERT') THEN
    RAISE EXCEPTION 'G1 QA39 premature table privileges exposed';
 END IF;
END $g1_task_policy_postconditions$;
