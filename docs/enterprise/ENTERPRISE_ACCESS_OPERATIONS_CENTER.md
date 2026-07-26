# Enterprise Access Operations Center

## Purpose

The Access Operations Center provides a durable, tenant-scoped control plane for high-volume group, role, seat and department reconciliation. It is designed for organizations with up to 10,000 identities while preserving the canonical transactional seat ledger and existing RBAC boundaries.

## Capabilities

- Durable access operations with pending, processing, paused, retry, completed, cancelled and dead-letter states.
- Member-level work items with before/after snapshots.
- Stable SHA-256 idempotency keys.
- Leased `FOR UPDATE SKIP LOCKED` processing.
- Pause, resume, cancel and retry-failed controls.
- Member-level success, failure, skip and compensation evidence.
- Private tenant-scoped CSV export.
- Append-only operational event history.
- Bounded batches of 1–500 identities and seed capacity up to 10,000 identities.

## Security boundary

- Organization scope is derived from the authenticated user or server-owned job row.
- Browser payloads never choose another organization.
- Administrative mutations require `manage_team`, trusted origin, fail-closed rate limiting and step-up authentication.
- Worker execution requires the internal cron secret and a trusted server-configured actor UUID.
- Role and seat changes continue through `provisionEnterpriseIdentity` and the canonical seat ledger.
- Tables and RPCs are forced-RLS and service-role only.
- CSV responses are private, no-store and `nosniff`.

## Failure model

A failed member is recorded independently, allowing retry without reprocessing successful members. If seat mutation succeeds but metadata persistence fails, the item is recorded as `compensated` instead of being silently reported as successful. Operational runs can be paused or cancelled without deleting evidence.

## Runtime configuration

The worker uses:

- `ENTERPRISE_RECONCILIATION_ACTOR_USER_ID`
- the existing internal cron authorization secret

The actor UUID must identify a controlled service actor. It must not be accepted from a request body.

## External validation required

The following remain `EXTERNAL_VALIDATION_REQUIRED`:

- Microsoft Entra ID end-to-end group provisioning and replay behavior.
- Okta end-to-end group provisioning and replay behavior.
- Google Workspace behavior where supported.
- A real Postgres execution with 10,000 identities.
- Production telemetry, alerting and operator runbook evidence.
- Human review of exported member reports and operational exception handling.

No provider certification or production-scale validation is claimed by this implementation.
