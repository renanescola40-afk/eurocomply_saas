# DAT-02: counter drift proof must include missing usage rows

Date: 2026-11-03. Owner: NORMAL_SECURITY_DATA. State: review required; no gate PASS.

## Reproduced defect
The earlier P0-F drift verifier started at `organization_usage` and left-joined
`organization_members`. If a tenant had an active membership row but no usage
row, the verifier omitted that tenant and could report zero drift incorrectly.
This is a monitoring/acceptance false negative, not evidence that customer data
was exposed or that this specific data state existed in production.

## Correction and trade-offs
Use a FULL OUTER JOIN between actual membership aggregates and stored usage
rows; flag a missing usage row in member, seat and admin mismatch counters.
Retain existing five counter definitions and add only one aggregated column,
`missing_usage_rows`. No individual organization IDs are returned. A usage
row for a genuinely empty organization is valid when all counters are zero.
No database schema, triggers, RPCs, RLS or operational data are changed.

## Verification and bounded runtime
Node 22.16.0 local source contract: 5/5 PASS.
PostgreSQL read-only synthetic CTE using two fabricated tenants and one usage
row: old LEFT JOIN checked 1 tenant and detected 0 drift; new FULL OUTER JOIN
checked 2 tenants, reported 1 missing row and 1 drift.
Live QA and PROD aggregate readbacks found zero missing usage rows and zero
member/seat/admin drift in the queried snapshots (QA checked 2 organization
records; production checked 266). This differs from an older production
drift checkpoint and must not be interpreted as migration or restore PASS.
Rerun exact committed SQL after any release and record the target SHA.

## Rollback and acceptance boundary
Revert the two-file source-only correction if it produces a reviewed false
positive. Do not turn off a blocking drift check just to make a gate green.
DAT-02 and A-13 still require native PG17 concurrency, quota, idempotency,
rollback and signed audit E2E; DAT-03 also requires durable billing and
transactional state checks. This source-level guard alone is NOT acceptance.
No production writes, production deployment, paid runner or emails performed.
