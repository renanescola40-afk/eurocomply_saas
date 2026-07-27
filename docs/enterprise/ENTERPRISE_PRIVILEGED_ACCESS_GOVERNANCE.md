# Enterprise Privileged Access Governance

## Purpose

Provide tenant-scoped, temporary and auditable elevation for Enterprise administrators without permanent privilege expansion.

## Control model

- Requests are limited to `admin` or `owner` elevation.
- Duration is bounded from 15 minutes to 24 hours.
- Two approvals are required by default.
- The requester cannot approve their own request.
- Only one pending, approved or active request may exist per target membership.
- All mutations require authenticated organization context, `manage_team`, trusted origin, fail-closed rate limiting and step-up authentication.
- Expiration is performed by an internal authenticated worker using bounded batches and `FOR UPDATE SKIP LOCKED`.
- Approval and lifecycle events are append-only.

## Operational sequence

1. An authorized administrator creates a request with target membership, role, duration and justification.
2. Independent administrators approve or reject the request.
3. Approved access is activated through the canonical membership/seat transaction path.
4. The expiry worker removes elevation at `expires_at`.
5. Failures are recorded as lifecycle events and escalated for operator review.

## External validation required

Production proof still requires configured scheduler execution, real Supabase migration evidence, identity-provider test tenants, alert delivery and human review of owner-elevation scenarios.

## Rollback

Disable the expiry scheduler, revert application routes and services, then roll back the additive migration only after confirming no active privileged-access request remains.