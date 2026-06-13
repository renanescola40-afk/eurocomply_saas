# Release Rollback Plan

This document defines the rollback plan that must be completed before promoting EuroComply to public production or enterprise environments.

## Purpose

A release can only be considered production-ready when the team can safely revert the application, configuration, database state, and operational posture if the deployment introduces a critical regression.

## Required rollback evidence

Before approving a release, attach evidence for each item below:

- The exact commit SHA promoted to the target environment.
- The previous known-good commit SHA or deployment ID.
- The owner responsible for initiating rollback.
- The owner responsible for customer communication.
- The owner responsible for database and Supabase recovery decisions.
- The owner responsible for Stripe or billing incident response.
- The owner responsible for post-rollback validation.
- The rollback decision threshold and severity criteria.
- The expected rollback time objective.
- The expected customer impact during rollback.

## Application rollback

The release owner must confirm that the application can be reverted to the last known-good deployment without requiring code changes during the incident.

Minimum evidence:

- Last known-good deployment identifier.
- Current deployment identifier.
- Verified path to promote or restore the last known-good deployment.
- Post-rollback smoke-test checklist.

## Database rollback

Database rollback must be treated separately from application rollback.

Minimum evidence:

- List of migrations applied in the release.
- Assessment of whether each migration is backward compatible.
- Confirmation that destructive migrations are blocked unless a manual recovery plan exists.
- Restore procedure for Supabase backups when irreversible data changes are involved.
- Validation that audit-chain integrity is preserved or explicitly reviewed after rollback.

## Configuration rollback

Configuration changes must be tracked with the release evidence package.

Minimum evidence:

- Environment variables changed for the release.
- Feature flags or runtime toggles changed for the release.
- Stripe webhook or billing configuration changes.
- Malware scanning provider configuration changes.
- Step-up authentication provider changes.
- Observability or alerting changes.

## Security-specific rollback considerations

Rollback must not silently disable critical security controls.

The rollback owner must verify:

- RLS remains enabled for critical tables.
- Audit-chain writes continue after rollback.
- Step-up gates remain active for sensitive operations.
- Upload signature validation remains active.
- Malware scanning policy remains consistent with the target environment.
- Billing webhook verification remains active.

## Go/No-Go impact

A release is a No-Go if:

- rollback ownership is missing;
- rollback target is unknown;
- database rollback impact is unknown;
- security controls may be weakened by rollback;
- customer communication owner is missing;
- post-rollback validation steps are missing.

A Conditional Go may be accepted only if the missing rollback item has a named owner, expiry date, and explicit approver in `docs/RELEASE_APPROVAL_RECORD.md`.

## Post-rollback validation

After rollback, the release owner must attach evidence for:

- application health check;
- authentication flow;
- organization isolation smoke test;
- document upload smoke test;
- billing portal or checkout smoke test when billing was touched;
- audit event creation smoke test;
- error monitoring review;
- customer-impact review.

## Required linked documents

This plan must be reviewed with:

- `docs/RELEASE_CANDIDATE_VALIDATION.md`
- `docs/RELEASE_EVIDENCE_CHECKLIST.md`
- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
