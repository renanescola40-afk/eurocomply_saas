# Commercial RLS policy composition review — 2026-10-15

Read-only pg_policies review against production Supabase. This document records policy metadata, not isolation effectiveness testing.

## Results
- 39 public tables reference the commercial authority or minimum-plan helper in RLS expressions.
- All 39 have at least one PERMISSIVE policy.
- 36 have a PERMISSIVE policy referencing a named organization-membership helper.
- The remaining 3 use an explicit RESTRICTIVE active-membership policy combined with per-user ownership conditions in permissive policies: compliance_findings, gap_answers, gap_assessments.
- Four sampled tables (ai_assessments, ai_literacy_programs, ai_systems, documents) use RESTRICTIVE payment/plan gates and separate membership-based PERMISSIVE access grants.

## Interpretation
Commercial-plan checks in these sampled policies cannot on their own grant access because the relevant commercial policies are restrictive. RLS generally combines PERMISSIVE policies by OR and then applies RESTRICTIVE policies by AND. A code review is still needed for all 39 tables and indirect service-role paths, followed by isolated tenant-A/tenant-B tests. No vulnerability or full security PASS is asserted.

## Remaining gates
1. Confirm applicable role/cmd, permissive policy coverage, ownership and tenant matching for all 39 tables.
2. Test effective SELECT/INSERT/UPDATE/DELETE in zero-new-cost isolated environment.
3. Audit service-role API callers and commercial helper disclosure risks.
4. Verify password protection warning and remaining Supabase security advisories.
5. Reconcile production SHA and schema after any approved changes.

No production DDL/DML, no user data changed, no email, no DataGuard demo change.
DATABASE_SECURITY_100=NO_PASS.
