# RISCK COMPLY — G1 P0-B historical RLS replay diagnostic, 2026-10-22

Status: **PARTIAL DIAGNOSIS — NATIVE POSTGRESQL REPLAY NOT VERIFIED / DAT-01 NO PASS**.

## Facts directly observed

- Production migrations: 137 in Supabase ledger, applied at production release SHA `70d3545f414d063379d481fd238aed563e05edda`.
- Disposable Supabase Pro development branch `g1-enterprise100-qa-20261022` was explicitly owner-approved for `USD 0.01344/hour`. Supabase provisioned it without copying production data; branch migration replay stopped at 26/137.
- Provider branching status: `MIGRATIONS_FAILED`; PostgreSQL log root error:
  `canonical RLS policy missing after consolidation: 12`.
- Failed historical ledger migration number 27, version `20260812225906` (`consolidate_canonical_rls_and_client_grants`).
- Production-ledger `statements` contains the **legacy strict** guard string and no partial-materialization clause; reviewed main-source file has `canonical RLS policy missing after partial materialization`. These claims were checked by read-only Supabase SQL predicates without exporting SQL bodies; detailed SHA-256 fingerprints are in `docs/enterprise/evidence/G1_PROD_PROVIDER_SQL_STATEMENT_SHA256_2026-10-22.json`.
- Temporary branch pre-delete readback proved zero Auth users/Storage objects and 26 migration ledger entries. Provider deletion succeeded, confirmed absent on final branch list. Production and other branches untouched.
- Existing independent QA `zrxrrfbllsxtleyxjpsz` remained empty: no app tables, no Auth users/Storage objects, no application migration ledger.

## Newly executed test work

Created source-based native PostgreSQL 17 isolated test `scripts/supabase/test-g1-historical-rls-replay-pg17.mjs` and a dedicated CircleCI job `g1-rls-pg17-proof` using **only** disposable PostgreSQL 17 and synthetic fixtures.

The job **failed** on repeated G1 branch builds:
- https://circleci.com/gh/renanescola40-afk/eurocomply_saas/342
- https://circleci.com/gh/renanescola40-afk/eurocomply_saas/344
- https://circleci.com/gh/renanescola40-afk/eurocomply_saas/347
- https://circleci.com/gh/renanescola40-afk/eurocomply_saas/351

The first iterations corrected an error in the test's private-host IPv4 regex and added IPv4-mapped-IPv6 normalization; CircleCI still returned failure. **The connector exposes only failed job statuses, not failing step logs or stack traces.** The remaining cause has NOT been established. Do not interpret this as proven security-regression, nor claim a passing migration replay. The native test is blocked pending inspection of CircleCI run stdout/stderr, or independent rerun on a controlled local PostgreSQL 17 host.

A separate **read-only SQL model** was actually run against existing isolated QA project `zrxrrfbllsxtleyxjpsz` (no DDL or data modification):

```
scenario | required policies | matched policies | missing after materialization
none     | 4                 | 0                | 0
partial  | 4                 | 1                | 3
complete | 4                 | 4                | 0
```

This checks the logical 0/N versus partial-policy predicate **only**; it does not prove that the real migration statement executes correctly on authentic schema prerequisites.

## Definite immediate next actions

1. Read CircleCI `g1-rls-pg17-proof` failed step output for a specific exception; do not spend cycles repeating identical failing jobs.
2. Fix the harness or source only after identifying the failing statement, then rerun on native PG17 with output bound to exact SHA.
3. For full DAT-01, use the independently reviewed production-ledger-bound replay and **provider statement digest+schema postcondition** validation from PR #2559. The current `CANDIDATE_NOT_EXECUTABLE` candidate is not a safe bootstrap manifest.
4. Rebuild isolated QA from a canonical reviewed plan with NO customer data, read back version ledger, RLS/FORCE RLS, constraints, ACL and tenant isolation before authenticated E2E.
5. Do not rewrite historical production ledger statements to fix branch cloning. No production or Stripe LIVE writes and no new billed branch without separately quoted consent.

## Score and scope

- `DAT-01=NOT_VERIFIED`
- `SEC-03=NOT_VERIFIED`
- `QAT-02=NOT_VERIFIED`
- `BIL-03=NOT_VERIFIED`
- `G1_A_ACCEPTED=2/38` (**5.26%** on isolated branch, governed integration pending)
- `ENTERPRISE_100=NO_PASS`

This diagnostic preserves failures transparently and does not authorize production changes.
