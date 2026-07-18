# Fail closed when security-questionnaire export auditing is unavailable

- **Status:** Accepted
- **Date:** 2026-07-18
- **Scope:** `GET /api/security-questionnaire/export`

## Context

The security-questionnaire export is an organization-scoped governance artifact intended for customer assurance and procurement workflows. The route already requires authentication, the `export_data` permission, a Business-or-higher plan, step-up authentication, distributed rate limiting, integrity metadata, and hardened no-store download headers.

The route also emitted `security_questionnaire.exported`, but it did not inspect the audit writer's explicit persistence result. The artifact could therefore be returned after an audit-chain, database, schema, provider, or privileged-client failure. That creates a false-success condition: a sensitive governance export can leave the service without durable accountability evidence.

## Decision

The export now requires `createAuditEvent` to return `persisted: true` before the response body or filename is disclosed.

When persistence is unavailable, the route:

- reports a fixed operational error area without including questionnaire content or secrets;
- returns a no-store HTTP 503 response with `security_questionnaire_export_audit_unavailable`;
- does not return the export payload or a download filename.

The existing authorization, entitlement, step-up, tenant, rate-limit, integrity, and download controls remain unchanged.

## Consequences

Audit-store availability becomes part of security-questionnaire export availability. This is intentional because a successful assurance artifact without durable export evidence is less trustworthy than a retryable failure.

The change does not claim runtime validation, external audit, penetration testing, or production evidence. Merge remains conditional on exact-head CI and human review.

## Risks

- A temporary audit persistence outage blocks legitimate exports.
- Clients must handle the stable 503 error as retryable.
- The audit event is persisted before the download response is transmitted, so a client disconnect can leave a durable event for an export that was not fully received. This is preferable to disclosing the artifact without evidence and matches the route's existing audit-before-response ordering.

## Rollback

Revert the commits from the associated pull request. No database migration, data rewrite, secret rotation, or configuration change is required.
