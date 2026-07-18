# Revoke team invitations when delivery is not confirmed

- Status: Proposed
- Date: 2026-07-18
- Priority: P1 security and product-integrity hardening

## Context

`POST /api/team/invites` creates a durable organization invitation before sending its email. The route already requires authentication, tenant-scoped `manage_team`, trusted mutation checks, fail-closed distributed rate limiting, step-up authentication, plan entitlement, bounded validation, and durable creation-audit persistence.

Before this decision, an email provider error or an unconfirmed delivery returned HTTP 503 but left the invitation active. The caller was told delivery failed while a valid invitation token and database record could remain usable. That split state creates lifecycle ambiguity, duplicate retries, and an avoidable active access-grant artifact whose intended delivery was not confirmed.

No production occurrence, token exposure, external audit finding, or penetration-test result is claimed.

## Decision

When invitation email delivery is not confirmed:

1. report the delivery error through the existing sanitized observability path;
2. attempt to delete the exact invitation using its organization ID and invitation ID;
3. record whether compensation succeeded in the `team_invite_delivery_failed` audit metadata;
4. return HTTP 503 with truthful `persisted`, `inviteRevoked`, and `auditPersisted` fields;
5. never create the success notification.

The compensation is deliberately scoped to the invitation created by the current request. Existing authentication, RBAC, step-up, plan, origin, validation, rate-limit, audit, and successful-delivery behavior remain unchanged.

## Consequences

A provider may have accepted an email immediately before returning an uncertain result. Revoking the invitation makes any such email link unusable, which is safer than leaving an access invitation active after the application reports failure. The inviter can retry and receive a newly generated invitation.

Compensation is best effort because invitation persistence and email delivery do not share a transaction. If deletion fails, the response truthfully reports that the invitation remains persisted, observability receives sanitized context, and the request still returns failure.

## Validation

A focused source-level regression test asserts that tenant-scoped deletion occurs before the failure response and that the response and audit metadata reflect compensation state. Required exact-head lint, typecheck, unit, build, security, dependency, secret-scanning, enterprise-readiness, and release checks remain authoritative.

This decision is repository evidence only. It is not proof of production deployment, provider behavior, operational effectiveness, regulatory compliance, an audit, or a pentest.

## Rollback

Revert the route change, regression test, and this decision record together. No schema migration, data backfill, environment variable, secret, or production evidence file is introduced. Reversion restores the prior behavior in which failed delivery can leave an active invitation.
