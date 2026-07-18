# Fail closed when GDPR export audit persistence is unavailable

Date: 2026-07-18
Status: Proposed

## Context

`GET /api/gdpr/export` prepares and returns an organization-scoped personal-data export after authentication, tenant resolution, `export_data` authorization, entitlement enforcement, rate limiting, scope validation, and step-up authentication.

Before this change, the route called `createAuditEvent` for `gdpr_export_requested` but ignored its explicit persistence result. It then created a success notification and returned the downloadable export. An audit database, schema, provider, privileged-client, or audit-chain failure could therefore allow sensitive data export without durable accountability evidence.

## Decision

A successful GDPR export now requires `createAuditEvent` to return `persisted: true` before either the success notification or the download response is produced.

When persistence is unavailable, the route:

- reports a sanitized operational error with fixed context;
- returns a no-store HTTP 503 response with `gdpr_export_audit_unavailable`;
- does not create the success notification;
- does not return the export payload or filename.

The existing authentication, tenant scoping, permission, entitlement, rate-limit, step-up, scope-validation, incomplete-export, and download-hardening controls remain unchanged.

## Consequences

This intentionally trades export availability for privacy accountability. Users may need to retry an otherwise valid export while audit persistence is unavailable. The export data may already have been assembled in server memory, but it is never returned to the caller when the audit write fails.

The denied-scope and incomplete-export audit paths remain best-effort because they describe rejected or failed disclosures rather than a successful release of sensitive data.

## Evidence boundaries

The repository change and source-level regression test prove the fail-closed control is present in code. They do not prove production database availability, runtime audit-chain health, deployment success, or end-to-end behavior. Those claims require exact-head CI and environment-backed runtime evidence.

## Validation

Relevant validation commands are:

```bash
npm test -- tests/security/gdpr-export-audit-fail-closed.test.ts
npm run lint
npm run typecheck
npm run security:audit-chain
npm run build
```

## Rollback

Revert the commits in the pull request. That restores the previous best-effort audit behavior and must be treated as a deliberate reduction in privacy-accountability guarantees.
