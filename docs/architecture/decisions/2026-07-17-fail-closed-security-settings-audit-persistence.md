# Fail closed when security-settings audit persistence is unavailable

- Status: Proposed
- Date: 2026-07-17
- Scope: `POST /api/security/settings`

## Context

The organization security-settings endpoint changes step-up authentication and enterprise identity-provider acceptance controls. The database mutation completed before the route called `createAuditEvent`, and the route returned HTTP 200 even when the audit writer explicitly returned `persisted: false`.

That behavior allowed a privileged security-control change to remain active without durable accountability evidence. Returning `auditPersisted: false` in a success payload did not prevent clients from treating the mutation as successful and did not restore the previous security posture.

## Decision

The route now reads the existing tenant-scoped settings before mutation. After the update, it requires the audit writer to report durable persistence before returning success.

When audit persistence is unavailable, the route:

1. restores the previous row with a tenant-scoped upsert, or deletes the newly created row when no previous row existed;
2. emits only a fixed, sanitized compensation-failure message if restoration fails; and
3. returns a no-store HTTP 503 response with `security_settings_audit_unavailable`.

A successful response now always reports `auditPersisted: true`.

## Consequences

Security-settings availability is intentionally reduced while the audit store is unavailable. This is preferable to silently applying unaudited changes to authentication controls.

Compensation is best effort because the database mutation and audit write are not part of one transaction. A concurrent settings update could theoretically race with restoration. The change remains narrowly scoped and does not alter authentication, authorization, trusted-origin checks, rate limiting, step-up verification, request bounds, or tenant isolation.

## Evidence boundaries

This decision and its regression test demonstrate source-level fail-closed behavior. They do not claim production runtime validation, external audit, penetration testing, or successful deployment. Exact-head CI and human review remain required before merge.

## Rollback

Revert the commits in the pull request. That restores the previous behavior where security-setting changes can succeed while audit persistence is unavailable. No schema, migration, dependency, secret, or external service change is required.
