# Evidence Gaps and Blockers

**Source SHA:** `6b54e899ffd4edd7ce26883f4fc715a3fef098e0`  
**Snapshot:** 2026-11-01T19:30:00Z  
**Scope:** 38 atomic controls / 24 formal gates (fixed)

## Current source status
- PASS: **2**
- BLOCKED: **1**
- NOT_VERIFIED: **35**
- Provider readback records captured: **3** (all structurally complete; none independently accepted)
- Gates eligible for independent review: **1**
- Gates accepted: **0**

## Verified provider blockers and warnings

1. **DAT-01 — BLOCKED:** Supabase read-only migration inventory shows 137 production migrations and 7 isolated-QA migrations (130-entry difference). Full canonical replay parity is not established. Do not write to production or bypass source review.
2. **DAT-05 — NOT_VERIFIED:** Supabase security advisor reports 33 INFO findings for RLS-enabled tables with no policies and 1 WARN for disabled leaked-password protection. The INFO findings do not alone prove exposure; inspect table-by-table intended access, grants, FORCE RLS and RPC ACLs.
3. **OPS-01 — REQUIRES RECONCILIATION:** Vercel reports production READY on SHA `70d3545f414d063379d481fd238aed563e05edda`; current GitHub main is `6b54e899ffd4edd7ce26883f4fc715a3fef098e0`. The existing source PASS is preserved, but current-main/deployment equality is not established.

## Remaining control families
- **SEC-01–SEC-06:** authenticated session lifecycle, RBAC, tenant isolation, privileged principals, secret handling and audit-chain runtime evidence.
- **FUN-01–FUN-06:** real authenticated onboarding, inventory, governance, evidence/export, privacy and marketed-product journeys.
- **BIL-02–BIL-05:** signed Stripe TEST webhooks, Checkout persistence, lifecycle and entitlement authorization.
- **DAT-02–DAT-04:** concurrency invariants, atomic rollback and isolated restore evidence.
- **QAT-01–QAT-04:** full exact-SHA regression/security suites, authenticated browser E2E, billing runtime and artifact provenance.
- **OPS-02–OPS-06:** required-check governance, smoke/monitoring, incident response, rollback and credential isolation.
- **TRU-01–TRU-06:** contracting, qualified legal review, privacy/DPA, transfer/retention and procurement assurance.

## Acceptance policy
A record is not a PASS merely because it exists or has a valid hash. PASS requires exact source SHA, reproducible test/provider query, artifact integrity, freshness, complete runtime conditions and independent reviewer acceptance. NOT_APPLICABLE requires a documented and approved rationale.
