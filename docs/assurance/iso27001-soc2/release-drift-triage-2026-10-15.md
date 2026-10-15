# ISO/SOC2 production drift release triage — 2026-10-15
Read-only discovery; no release.

Vercel latest production: dpl_2Gz8W5BhreKD7AwN28yVnSCjAyhq; SHA 857ddfb21d0135df3a026ad480da5945119b175c; READY.
GitHub compare deployed SHA -> main observed status ahead, ahead_by 113, behind_by 0; 65 changed files in compare result. These values supersede prior 108-commit snapshot.

Changes include one SQL migration: supabase/migrations/20261015090000_enterprise_entitlement_v3_compatibility.sql. It creates a SECURITY DEFINER entitlement v3 resolver, grants only service_role, retains v2 service-role entrypoint; DB migration application and runtime acceptance not verified.

Source review documents describe a high-priority legacy membership fallback risk in src/server/security/rbac.ts under SQLSTATE 42703; exploitability and current deployed relevance not confirmed. Do NOT remove without isolated schema and runtime tests.

Pre-deploy blocking checks:
1. Confirm latest current main exact SHA and run all required checks on candidate.
2. Reconcile database migration preconditions, v2/v3 RPC caller compatibility, entitlements and grants.
3. Verify membership fallback fail-closed behavior with inactive tenant member and missing-column isolated fixtures.
4. Verify email side effects fully disabled in all isolated tests.
5. Regression test DataGuard journey with synthetic equivalents, never modify real demo.
6. Confirm Stripe checkout/webhook contracts without LIVE mutations.
7. Obtain release decision, preview confirmation and monitoring/rollback plan before production promotion.

Progress: drift detection 100% completed, reconciliation/remediation 0% verified; 113 commits currently ahead (not a percentage of product readiness). Global ISO/SOC2 readiness NOT YET MEASURABLE.
No email sent, no production or DataGuard data written, no purchase or deployment.
