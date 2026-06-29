-- Explicit DELETE policy coverage for onboarding activation runs.
-- Required by the RLS gate; restricted to organization managers.

alter table public.onboarding_activation_runs enable row level security;

drop policy if exists "Managers can delete onboarding activation runs" on public.onboarding_activation_runs;
create policy "Managers can delete onboarding activation runs"
on public.onboarding_activation_runs for delete
using (public.has_org_role(organization_id, array['owner','admin','compliance_manager']));
