# RISCK COMPLY — ISO 27001 and SOC 2 Readiness Baseline
Date: 2026-10-14
Status: INITIAL DISCOVERY — NOT AN AUDIT OPINION
Owner approval status: Draft; management acceptance pending
Scope candidate: RISCK COMPLY SaaS and operating legal entity (to be confirmed)
Frameworks: ISO/IEC 27001:2022 (+Amd 1:2024 where applicable); AICPA SOC 2 Security, optional categories TBD

## Non-negotiable change restrictions
- No emails sent, replied to, forwarded or scheduled.
- No changes to production, DataGuard demo workspace, identity, entitlements, billing, credentials or customer data.
- No paid engagements.
- Findings remain internal. No implied certification or issued SOC 2 report.
- Production changes need separate change authorization after DataGuard impact review.

## Verified discovery, 2026-10-14
1. GitHub repository `renanescola40-afk/eurocomply_saas` reachable; `README.md` describes Next.js, Supabase Auth, Postgres RLS, Stripe and security/release gates. These are design statements, not control test results.
2. Vercel project `eurocomply-saas` is accessible. Latest production-target deployment in the observed deployment list: `dpl_2Gz8W5BhreKD7AwN28yVnSCjAyhq`, state READY, commit `857ddfb21d0135df3a026ad480da5945119b175c`. Deployment READY does not prove security controls or end-user demo health.
3. Supabase production project `tganhbbhfxcpblmgqprg` reports ACTIVE_HEALTHY.
4. Read-only Postgres catalog count: among `public` schema tables, 115/115 had RLS enabled and 0 had RLS disabled at capture. This does not prove RLS policies are correct, FORCE RLS is in use, other schemas are covered, or role bypass is excluded.
5. Stripe connector enumerated live account `acct_1U6IuJGt3cgjPOtq`. No live customer, payment, or subscription data was inspected or changed.
6. No emails were sent and no production changes were made in this discovery.

## Priority gaps and next controls to validate
- ISO clauses 4–10: approved ISMS scope, stakeholders, risk methodology, treatment, SoA, competence, internal audit, management review, corrective actions.
- ISO Annex A: create 93-control applicability/implementation matrix with evidence links; mark every control NOT_ASSESSED initially.
- SOC 2: scope Security; create system description and control-to-TSC matrix; distinguish Type I as-of-date evidence from Type II observation period.
- Production main SHA vs deployment SHA; branch protection; signed approvals and release controls.
- RLS policy correctness, SECURITY DEFINER functions, privileged bypass paths, test-tenant isolation, Storage authorization.
- Access reviews, MFA, secrets, incident exercises, backups and restore tests, dependency scanning, vendor due diligence, logging retention.
- Verify DataGuard protection indirectly via read-only metadata only; do not interact with the demo account.
- Legal entity, ISMS owners, audit perimeter, organization-approved policies are UNVERIFIED.
- External certifier and SOC 2 auditor not engaged.

## Progress calculation
All ISO27001/SOC2 readiness percentages: NOT_YET_MEASURABLE.
Do not count RLS-enabled status or documentation existence as audit compliance.
Classification: DISCOVERED != VERIFIED_OPERATING != AUDIT_ACCEPTED.

## Next authorized step
Build a structured control/evidence register in this isolated branch, validate static security controls and read-only metadata, propose narrowly scoped fixes with tests and DataGuard impact assessment, and request management actions only where necessary.
