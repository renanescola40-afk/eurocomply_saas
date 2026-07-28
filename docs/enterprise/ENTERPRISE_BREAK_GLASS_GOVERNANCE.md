# Enterprise Break-Glass Governance

## Objective

Provide a bounded emergency access path for genuine production incidents without creating a permanent bypass around normal RBAC, approval or audit controls.

## Control model

- Tenant scope is derived server-side from the authenticated organization context.
- Only `admin` and `owner` elevations are supported.
- Requests last between 15 minutes and 4 hours.
- Two independent approvals are required by default.
- Requesters cannot approve their own request.
- Only one open request may target a membership.
- All mutations require `manage_team`, trusted mutation validation, fail-closed rate limiting and step-up authentication.
- Revocation and expiry move the request into mandatory post-incident review.
- Events are append-only and chained with SHA-256 hashes.
- Tables are forced-RLS and service-role only.

## Lifecycle

1. Request emergency access with incident reference and justification.
2. Obtain independent approvals.
3. Activate through the canonical membership/seat path.
4. Monitor the bounded expiry window.
5. Revoke immediately when containment is restored.
6. Complete a post-incident review within 48 hours.
7. Close only after findings and remediation are recorded.

## Production evidence boundary

Repository code proves intended controls only. Production completion requires live migration evidence, real step-up/MFA proof, scheduler execution evidence, concurrent race testing, alerting and a genuine post-incident review. No repository artifact proves that an emergency was legitimate or that a reviewer was independent.
