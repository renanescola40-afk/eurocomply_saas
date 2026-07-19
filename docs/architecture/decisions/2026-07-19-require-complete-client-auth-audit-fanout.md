# Require complete client authentication audit fan-out

- Status: Proposed
- Date: 2026-07-19
- Scope: client-reported login success, login failure, and logout audit events

## Context

`recordAuthAuditEvent` writes one audit entry for each organization associated with an authenticated actor. When no organization is available, it writes one global entry. The client server action previously summarized the returned writes with `Array.some`.

For a user belonging to multiple organizations, one successful write and one failed write therefore produced `persisted: true`. The same partial-success behavior applied to the chained result. Callers could interpret that response as complete durable audit coverage even though one tenant-scoped authentication event was missing.

This finding is based on repository control flow. It does not claim a production incident, exploit, external audit result, penetration test, or customer impact.

## Decision

The client authentication audit action reports:

- `persisted: true` only when the writer returns at least one result and every required result is persisted;
- `chained: true` only when persistence is complete and every required result is chained.

The underlying fan-out behavior, supported actions, actor resolution, metadata minimization, and fail-closed distributed rate limiting remain unchanged.

## Consequences

Partial multi-organization audit persistence is now represented truthfully as failure. Clients that inspect the result may surface or retry the audit operation instead of treating incomplete tenant coverage as successful.

This change does not make authentication itself dependent on client-side audit delivery. It only corrects the result contract of the explicit audit server action.

## Risks

- Existing callers that relied on partial success may observe more `persisted: false` results.
- The action does not retry failed organization writes; retry and reconciliation remain separate concerns.
- The source-level regression test verifies the contract but does not prove live database or audit-chain behavior.

## Evidence boundary

This decision provides source-review and regression-contract evidence only. It does not prove production deployment, provider availability, live multi-organization fan-out, audit retention, external assurance, or regulatory compliance.

## Rollback

Revert the implementation, regression test, and this decision record together. No schema migration, data backfill, dependency rollback, secret rotation, or infrastructure change is required.
