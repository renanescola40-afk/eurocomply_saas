# Fail closed when dashboard governance data is unavailable

- Date: 2026-07-16
- Status: Accepted
- Scope: organization dashboard summaries, previews, entitlements, trends, and metric snapshots

## Context

The organization dashboard combines compliance tasks, risks, vendors, documents, AI systems, audit events, billing entitlements, and metric history into readiness and compliance indicators.

Before this decision, unavailable privileged Supabase configuration, database errors, and application-level timeouts were converted into fallback values such as zero counts, empty lists, an empty AI inventory, or Essential-plan entitlements. Those values were then used to calculate compliance scores and workflow readiness.

A successful query with zero rows is a valid business state. A failed or timed-out query is not. Treating both states as equivalent can fabricate an apparently valid dashboard, conceal open governance work, and produce misleading executive or evidence outputs.

## Decision

Dashboard governance reads fail closed.

1. Dashboard reads require the server-only privileged Supabase client.
2. Provider errors are logged only with stable labels and error codes.
3. Provider messages, details, hints, SQL, identifiers, and payloads are not propagated.
4. Count, preview, AI-system, audit-event, entitlement, and trend failures throw application-owned sanitized errors.
5. Application-level timeouts reject instead of resolving fallback values.
6. Empty arrays and zero counts remain valid only after successful zero-row or zero-count queries.
7. Metric snapshot recording remains asynchronous, but configuration and write failures are surfaced to the existing sanitized background-error log.
8. No compliance score or readiness result is produced from fallback data.

## Risks and trade-offs

- A single unavailable critical dashboard dependency can make the organization dashboard unavailable instead of partially populated.
- The timeout wrapper does not cancel the underlying Supabase operation; it only bounds how long the application waits for it.
- More visible failures may increase support volume during provider incidents, but they prevent false compliance assurance.
- Metric snapshots remain best effort at the page boundary and can still fail after the dashboard response is produced.
- This decision does not prove production availability, provider latency, deployed database state, or runtime error-boundary behavior.

## Verification

`tests/security/dashboard-data-integrity-fail-closed.test.ts` verifies that:

- required privileged-client creation replaces best-effort client fallback;
- count failures cannot become zero compliance signals;
- preview and AI-system failures cannot become valid empty sections;
- timeouts reject rather than resolve fallback values;
- Essential-plan entitlements are not substituted after billing failures;
- successful zero-row results remain valid;
- errors remain application-owned and provider details are not exposed.

The exact pull-request head must pass lint, typecheck, unit tests, build, Full Security Suite, Enterprise Readiness Scorecard, Enterprise Production Gate, secret scanning, and static analysis before merge.

## Rollback

Revert the pull request. No schema, migration, RLS, RBAC, dependency, secret, or infrastructure rollback is required. Reverting restores the risk that dashboard outages can be represented as valid empty or low-risk governance state.
