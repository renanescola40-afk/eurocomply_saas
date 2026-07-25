# Enterprise reconciliation operations

## Purpose

This control plane operates the SCIM group-access reconciliation queue without exposing tenant data or worker internals.

## Capabilities

1. Bounded queue draining, maximum 100 jobs per invocation.
2. Server-derived audit actor through `ENTERPRISE_RECONCILIATION_ACTOR_USER_ID`.
3. Queue health counters for pending, processing, retry, dead-letter and completed jobs.
4. Oldest-pending age for backlog alerting.
5. Tenant-scoped dead-letter replay.
6. Retention pruning limited to 7–365 days.
7. Internal-secret authentication and authentication rate limiting.
8. `Cache-Control: no-store` responses.
9. Service-role-only database RPCs.
10. Dedicated CI assurance for the operational surface.

## Required configuration

- `ENTERPRISE_RECONCILIATION_ACTOR_USER_ID`: trusted service/audit actor UUID.
- Internal cron secret used by `isAuthorizedInternalCronRequest`.

## Suggested alerts

- `dead_letter > 0`: page the enterprise operations owner.
- `oldest_pending_age_seconds > 900`: warn.
- `oldest_pending_age_seconds > 3600`: page.
- `processing > 0` with no completion for 20 minutes: investigate expired leases.

## Truth boundary

Repository tests prove contracts only. Entra ID, Okta, Google Workspace and production-scale processing remain external validation requirements.
