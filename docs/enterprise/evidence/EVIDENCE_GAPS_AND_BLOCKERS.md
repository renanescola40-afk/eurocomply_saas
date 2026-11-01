# Evidence Gaps and Blockers

**Snapshot:** 2026-11-01  
**Frozen G1 baseline:** `70d3545f414d063379d481fd238aed563e05edda`  
**Fixed scope:** 24 primary Product Ready gates / 38 mandatory atomic child controls.

## Progress (never reduce denominators)

- Primary Product Ready source PASS: **2/24 = 8.33%**.
- Primary Product Ready remaining: **22/24 = 91.67%**.
- Secondary atomic source PASS: **2/38 = 5.26%**.
- Secondary atomic controls remaining: **36/38 = 94.74%**.
- Independent Evidence Factory gate acceptances: **0/24 = 0%**.
- Source statuses: 2 PASS, 1 BLOCKED, 35 NOT_VERIFIED.
- Gates eligible for independent review: 2 (A-09, A-18).
- Gate A-12 BLOCKED; remaining 21 NOT_ELIGIBLE.

## Confirmed provider blockers and warnings

1. **DAT-01 — BLOCKED:** Supabase read-only migration version comparison: production has 137 versions; isolated QA has 7; shared versions are 0. All 137 production versions are absent from QA and all 7 QA versions are absent from production. Full canonical replay parity is not established. Do not write to production or bypass source review.
2. **DAT-05 — NOT_VERIFIED:** Supabase security advisor reports 33 INFO findings for RLS-enabled tables without policies and 1 WARN for disabled leaked-password protection. A follow-up read-only catalog query found 115/115 public base tables with RLS and FORCE RLS in both production and isolated QA; 33 tables in each have no policies, but neither `anon` nor `authenticated` has SELECT or write grants on those no-policy tables. This narrows the direct-grant concern but does not prove tenant isolation. Function EXECUTE grants, SECURITY DEFINER behavior, Storage policies, service_role boundaries and full schema parity remain unverified.
3. **OPS-01 — source PASS preserved:** Vercel reports production READY on SHA `70d3545f414d063379d481fd238aed563e05edda`, matching the frozen G1 baseline and the existing OPS-01 acceptance SHA. Current main is newer, but that difference alone does not invalidate OPS-01. Runtime smoke/E2E remains unverified separately.

## Remaining control families

- **SEC-01–SEC-06:** authenticated session lifecycle, RBAC, tenant isolation, privileged principals, secret handling and audit-chain runtime evidence.
- **FUN-01–FUN-06:** authenticated onboarding, inventory, governance, evidence/export, privacy and marketed-product journeys.
- **BIL-02–BIL-05:** signed Stripe TEST webhooks, Checkout persistence, lifecycle and entitlement authorization.
- **DAT-02–DAT-04:** concurrency invariants, atomic rollback and isolated restore evidence.
- **QAT-01–QAT-04:** exact-SHA regression/security suites, authenticated browser E2E, billing runtime and artifact provenance.
- **OPS-02–OPS-06:** required-check governance, smoke/monitoring, incident response, rollback and credential isolation.
- **TRU-01–TRU-06:** contracting, qualified legal review, privacy/DPA, transfer/retention and procurement assurance.

## CI diagnostic blocker

Enterprise Evidence Tests runs `41341793480` and `41342152434` failed. Job summaries exposed no steps; log retrieval returned BlobNotFound. Root cause is unconfirmed. Latest source-provenance validator test changes have not yet been verified by a successful run.

## Acceptance policy

A record is not PASS merely because it exists or has a hash. New Evidence Factory PASS requires exact source SHA, reproducible test/provider query, artifact integrity, freshness, complete runtime conditions and independent reviewer acceptance. Existing source PASS entries remain preserved only where their canonical acceptance metadata and referenced evidence exist. NOT_APPLICABLE requires documented and approved rationale.
