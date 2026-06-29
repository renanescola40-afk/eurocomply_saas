-- Apply the standard enterprise org-scoped RLS helper to onboarding activation runs.
-- This keeps migration coverage consistent with other organization_id tenant tables.

select public.app_rls_org_scoped_enterprise('onboarding_activation_runs');
