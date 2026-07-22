# 2026-07-21 — Enterprise tenant licensing foundation

## Added

- Contract-backed Enterprise licensing for organization tenants.
- Independent full, participant and viewer seat types.
- Total member and administrator limits.
- Central fail-closed entitlement resolution.
- Serialized, idempotent seat reservation and release RPCs.
- Pending invitation capacity reservation.
- Membership and invitation usage reconciliation triggers.
- Explicit, audited contract lifecycle transitions.
- Enterprise platform roles consolidated into `platform_admin_users`.
- MFA-protected `/{locale}/platform` Control Center.
- Protected contract provisioning, status transition and usage APIs.
- Protected member seat change, suspension and reactivation API.
- Shared provisioning adapter for future SCIM, SSO, CSV, API and platform entrypoints.
- Compatibility contracts for existing organizations.
- Architecture decision, implementation documentation and operations/rollback runbook.

## Changed

- Team invitation creation now reserves a contracted seat transactionally.
- Invitation acceptance now uses the pending-aware seat allocator.
- Organization role promotions to owner/admin now enforce the contracted administrator limit.
- Existing platform administration keeps its AAL2 MFA requirement while supporting dedicated Enterprise capabilities.

## Security

- New licensing tables use forced RLS and explicit service-role grants.
- Browser roles have no direct contract, entitlement, usage or seat-operation table access.
- Critical RPCs use fixed `search_path`, row locks and expected-state checks.
- Contract and seat writes emit sanitized audit events.
- Platform APIs use trusted-origin checks, distributed fail-closed rate limiting, no-store responses and sanitized errors.

## Compatibility

- Existing organizations receive a permissive compatibility contract to prevent accidental lockout during rollout.
- Existing invitation callers may omit `seatType`; viewer invitations default to viewer seats and other current roles default to full seats.
- Existing sales-console platform roles remain supported.

## Not yet production-proven

- CSV import worker and per-row processing.
- Complete SCIM HTTP server and provider conformance.
- SAML/OIDC provisioning wired end to end.
- Stripe negotiated-contract automation.
- Scheduled payment-state transitions.
- Live migration and rollback rehearsal.
- Measured 1,000/3,000/10,000-member load and concurrency evidence.
- Customer-facing license management interface.
