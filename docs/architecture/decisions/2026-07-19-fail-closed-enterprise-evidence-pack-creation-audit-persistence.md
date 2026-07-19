# Fail closed on enterprise evidence-pack creation audit persistence

- Status: Proposed
- Date: 2026-07-19
- Scope: `POST /api/ai-systems?workflow=evidence_pack`

## Context

The evidence-pack workflow creates an `enterprise_evidence_packs` row and its seed `enterprise_evidence_pack_items` through the backend-only `create_enterprise_evidence_pack_atomic` RPC. The RPC is transactionally atomic for the pack and items, but the durable chained audit event is persisted separately.

The route previously awaited `createAuditEvent` and ignored its explicit `persisted` result. Because the audit writer can truthfully return `persisted: false`, the route could return HTTP 201 while a material AI-governance evidence artifact existed without durable actor and tenant accountability evidence.

This finding is based on repository control flow. It does not assert a production incident, exploit, penetration test, external audit result, certification, or customer impact.

## Decision

The route must require `audit.persisted === true` before returning creation success.

When audit persistence fails, the route attempts to delete the exact newly created pack using:

- pack ID;
- organization ID;
- creating user ID;
- creation timestamp.

Deleting the pack also removes its seed items through the existing `pack_id ... on delete cascade` foreign key. The request returns a no-store HTTP 503 with the stable error code `evidence_pack_audit_unavailable`.

Compensation failures are reported only through a fixed event name and a sanitized provider code.

## Consequences

### Positive

- A new evidence pack is not represented as successfully created without durable accountability evidence.
- Compensation is narrowly scoped and does not require a migration, dependency, secret, or infrastructure change.
- Existing authorization, trusted-origin validation, bounded input parsing, tenant scoping, and rate limiting remain unchanged.

### Trade-offs

- Audit-subsystem unavailability temporarily makes evidence-pack creation unavailable.
- Pack creation and audit persistence are not one database transaction, so compensation is best effort.
- A concurrent mutation or provider failure can prevent deletion; the request still fails closed and emits a sanitized operational warning for reconciliation.

## Evidence boundary

This decision provides source-review, regression-contract, and architecture-record evidence only. It does not prove production deployment, live compensation success, provider availability, RLS correctness, external assurance, penetration testing, or regulatory compliance.

## Rollback

Revert the route, test, and this decision record together. No database migration, data backfill, dependency rollback, secret rotation, or infrastructure rollback is required. Existing evidence packs are not modified by rollback.
