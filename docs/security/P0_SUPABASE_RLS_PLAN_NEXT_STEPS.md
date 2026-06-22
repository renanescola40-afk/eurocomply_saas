# P0 Supabase RLS Plan Next Steps

After this branch is merged:

1. Fill a reviewed plan from `docs/security/evidence/templates/supabase-live-rls-plan.template.json`.
2. Validate the filled plan with `scripts/security/check-p0-supabase-rls-plan.mjs`.
3. Execute the approved live validation outside the repository.
4. Store redacted output in the approved evidence location.
5. Fill `docs/security/evidence/runtime/supabase-live-rls-validation.json`.
6. Update `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md`.
7. Open the final runtime evidence PR.

Only step 5 and 6 can move P0 runtime evidence from 2/5 to 3/5 for the Supabase item.
