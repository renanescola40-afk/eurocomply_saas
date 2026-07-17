# Fail closed on audit-trail reads

- Status: Accepted
- Date: 2026-07-17
- Scope: `listAuditEventsForUser`

## Context

The authenticated audit-log page consumes organization-scoped records from `audit_events`. The query previously returned demonstration rows when the user had no current organization and returned an empty array when the privileged Supabase client was unavailable or the database query failed.

Those fallbacks made fabricated activity and unavailable evidence indistinguishable from a valid audit trail. For an audit, compliance, or incident-review surface, that ambiguity is materially unsafe: a database outage, missing table, permission error, or configuration failure could be presented as a valid empty trail.

## Decision

Audit-trail reads must preserve three distinct states:

1. A user without a current organization has no organization-scoped audit trail, so the loader returns an empty collection without inventing records.
2. A successful query with zero rows returns an empty collection.
3. Privileged-client creation or database-query failures propagate to the existing application error boundary. Query failures are logged only with the provider error code and are exposed to callers through the existing stable error `Unable to load audit activity.`.

The audit loader therefore uses `createAdminClient()` and no longer contains demonstration audit entries or schema-fallback handling.

## Consequences

### Positive

- The product cannot display fabricated events as audit evidence.
- Database and configuration failures cannot masquerade as a valid empty audit trail.
- Organization scoping, ordering, row limits, and successful zero-row behavior remain unchanged.
- Provider messages and sensitive configuration are not exposed.

### Risks

- Environments without the required audit table or service-role configuration now show an error instead of an empty table. This is intentional fail-closed behavior and may reveal previously hidden deployment defects.
- This change does not prove runtime availability, completeness, immutability, retention, or external audit assurance.
- Notification fallbacks remain outside this decision and are unchanged.

## Verification

A source contract test verifies that the audit loader:

- contains no demonstration audit rows;
- requires the privileged client;
- throws on query errors after code-only logging; and
- still maps a successful zero-row result to an empty collection.

Runtime database evidence is not created or claimed by this change.

## Rollback

Revert the commits in the pull request. Reintroducing fabricated audit rows or silent database-error fallbacks is not an acceptable operational workaround; any rollback should be paired with an explicit product decision and a separate non-evidentiary demo surface.
