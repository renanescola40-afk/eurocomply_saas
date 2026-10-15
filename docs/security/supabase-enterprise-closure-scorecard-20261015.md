# RISCK COMPLY — evidence-scoped Supabase security closure scorecard
Date: 2026-10-15 | Scope: database/identity/storage/runtime security | Status: NO_PASS

## Important interpretation

This is a **12-item task checklist**, with equal weight solely to provide the owner a transparent progress indicator.
It does **not** quantify the percentage of code security, enterprise readiness, regulatory compliance, or vulnerability freedom.
A checked catalog/metadata task is **not** an effective security proof. Do not transform a catalog count into a production security PASS.

- 5/12 evidence-scoped checklist entries completed (41.7%).
- 7/12 remain open (58.3%).
- DATABASE_SECURITY_100=NO_PASS; PRODUCTION_GO=NO_GO pending the separate release gates.

| # | Gate | Status | Evidence / specific next step |
|---|---|---|---|
| 1 | Public base-table RLS + FORCE RLS inventory | METADATA_CHECKED | Supabase catalog: 115/115 enabled and forced |
| 2 | Public no-policy table direct permission checks | METADATA_CHECKED | 33/33 reviewed for direct anon SELECT and authenticated SELECT/DML; indirect paths untested |
| 3 | SECURITY DEFINER direct EXECUTE ACL catalog | METADATA_CHECKED | 138 reviewed; 0 PUBLIC, 0 anon and 7 authenticated-executable; privileged functions require behavioral audit |
| 4 | Commercial-plan RLS policy composition | METADATA_CHECKED | 39/39 tables have a permissive policy and recognizable membership check, including restrictive checks in three; actual effective access untested |
| 5 | Business Storage bucket privacy/limits + RLS policy-role inventory | METADATA_CHECKED | Four named buckets pass `scripts/security/audit-supabase-storage-buckets-runtime.sql`; no explicit anon/public storage.objects policy; signed URL and service-role access untested |
| 6 | Isolated synthetic tenant A/B SELECT tests | OPEN | No real tenant-A/B Supabase proof; mocked runner tests are not runtime evidence |
| 7 | Isolated tenant A/B INSERT/UPDATE/DELETE tests | OPEN | Reproduce role-based positive/negative operations and backend-only denies |
| 8 | Isolated Storage A/B operations and signed URLs | OPEN | Verify download/upload/update/delete, URL expiry and cross-tenant denial |
| 9 | API/service-role horizontal isolation, RBAC and negative tests | OPEN | Independently prove caller-bound organization checks for server routes and RPC paths |
| 10 | Supabase Auth breached-password protection | OPEN | Security advisor WARN: disabled; Supabase docs list native leaked-password protection as Pro+; owner needs approved supported remediation or formal exception |
| 11 | CI/CodeQL and security suite fully green | OPEN | Recent builds had failures and cancelled/queued checks; CodeQL previously couldn't upload because code scanning was not enabled |
| 12 | Production main/deployment/Supabase evidence reconciliation and approval | OPEN | Vercel www.risckcomply.com observed at SHA 3310757dc82c2f5b07a5763b2e4b6e9fc5b4bfc5, behind GitHub main; do not disrupt DataGuard demo; separate Legal Assurance runtime schema check returned NO_GO_SCHEMA_MISSING (0/4 required tables, absent private bucket and guards) |

## Operational decisions

- Keep production and DataGuard demo unchanged until appropriate runtime validation and controlled promotion.
- Do not send emails, leak secrets, create unapproved expense or label mock/unit tests as live proofs.
- CI unit tests, static SQL metadata results and deployment READY are not replacements for negative tenant-isolation tests.
- Recalculate the 5/12 score only as each explicitly named gate produces complete evidence; preserve failures as OPEN.

## Additional runtime drift evidence (2026-10-15)

- The feature-flagged Legal Assurance server code and source migrations exist, but the production catalog lacks four required public relations (`legal_review_artifacts`, `legal_review_decisions`, `legal_review_requests`, `counsel_profiles`), the private `legal-assurance-artifacts` bucket, the artifact decision guard function/trigger and all four direct-deny policies.
- The exact `scripts/security/audit-legal-assurance-production-schema.sql` query returned `NO_GO_SCHEMA_MISSING` on production, without writes. The source migration `20260901005000_legal_assurance_private_artifacts.sql` declares those relations as prerequisites and cannot be applied alone.
- Migration dependency chain begins at `20260901002000_legal_assurance_enterprise_v1.sql`, followed by additional legal assurance gates and atomic operations. Only stage and verify on an isolated database first; review migration ordering and product flag binding before production promotion.
- Treat this as a missing optional subsystem/runtime readiness issue, **not** evidence of an active data exposure or a reason to force-enable the feature.
- Do not count this audit as a newly completed gate; the score remains 5/12, with 58.3% of defined gates unverified.
