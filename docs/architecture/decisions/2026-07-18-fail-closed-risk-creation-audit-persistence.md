# Fail closed on risk creation audit persistence

Date: 2026-07-18
Status: Proposed

## Context

`createRisk` creates an organization-scoped risk-register entry after authentication, `risks:write` authorization, validation, and fail-closed distributed rate limiting. It then emits `risk.create` through the shared audit writer.

The prior implementation awaited the audit call but ignored its explicit `persisted` result and returned the created risk. A database, schema, privileged-client, provider, or audit-chain failure could therefore leave a new governance risk active without durable cross-cutting accountability evidence.

This is treated as a P1 governance and audit-integrity gap. Risk-register entries influence mitigation ownership, prioritization, acceptance, and enterprise assurance.

## Decision

Risk creation must not be reported as successful unless `risk.create` is durably persisted.

When audit persistence fails, the server action attempts to delete the exact newly inserted row, scoped by:

- risk ID;
- organization ID;
- creator user ID.

The action then returns the existing generic creation failure. Compensation failure is reported through the existing sanitized observability path and does not turn the request into success.

## Consequences

- Risk creation is temporarily unavailable while audit persistence is unavailable.
- Successful risk creation now has durable cross-cutting audit evidence.
- Compensation remains best effort because the domain insert and audit-chain write do not share one database transaction.
- A compensation failure can leave an undisclosed risk row requiring operational investigation.
- Authentication, tenant authorization, validation, rate limiting, and the successful response contract are unchanged.

## Evidence boundary

The accompanying regression test is source-level evidence that the persistence result is checked before success and that rollback is tenant- and creator-scoped.

This decision does not claim production deployment, runtime compensation success, regulatory compliance, an external audit, or a penetration test. Exact-head CI and human review remain required before merge.

## Rollback

Revert the route change, regression test, and this decision record together. No schema migration or data backfill is introduced. Reversion restores the previous availability behavior and the known audit-accountability gap.
