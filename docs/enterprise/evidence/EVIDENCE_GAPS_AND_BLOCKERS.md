# Evidence Gaps and Blockers

- Source SHA: `6b54e899ffd4edd7ce26883f4fc715a3fef098e0`
- Scope: 38 controls / 24 gates (fixed)
- Newly generated evidence: **0**
- Source status: **2 PASS / 1 BLOCKED / 35 NOT_VERIFIED**
- Gates eligible for review: **2**; gates accepted by this factory: **0**

## Priority blockers
1. **DAT-01 — BLOCKED:** canonical replay stopped at 47/137; step 48 fails due to 20 missing required RLS policies across 8 tables; durable QA migration entries remain 0. Production remains read-only.
2. **BIL-02/BIL-03:** signed Stripe TEST webhook and genuine Checkout-to-QA entitlement proof.
3. **SEC-01–SEC-06:** authenticated session, role, privileged principal, tenant isolation, secrets and audit runtime proofs.
4. **FUN-01–FUN-06:** authenticated onboarding, inventory, governance, evidence/export, privacy and marketed-product journeys.
5. **DAT-02–DAT-05:** transaction invariants, rollback, isolated restore and production RLS/grant readbacks.
6. **QAT-01–QAT-04:** complete suites, authenticated E2E, billing runtime and exact-SHA deployed artifact provenance.
7. **OPS-02–OPS-06:** enforced governance, monitoring, incident response, rollback and credential isolation.
8. **TRU-01–TRU-06:** contracting, legal, privacy, transfer, retention and procurement claims with qualified review.

## Acceptance rules
No status is promoted from file presence alone. PASS requires exact-SHA provenance, a real artifact, reproducible command/provider query, valid SHA-256, freshness where relevant and independent reviewer acceptance. NOT_APPLICABLE requires a documented, approved applicability rationale.
