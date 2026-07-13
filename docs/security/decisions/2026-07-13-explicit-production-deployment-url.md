# Require an explicit production deployment URL for final release validation

Date: 2026-07-13
Status: Proposed in draft pull request
Priority: P1 release integrity

## Context

The enterprise release environment preflight accepted `VERCEL_URL` as sufficient proof that a deployment target was configured. `VERCEL_URL` is deployment-scoped and may identify a preview deployment. Presence alone does not establish that the final release runner is targeting the intended public production hostname.

This is a deterministic repository configuration gap. It is not evidence that a production release was previously validated against a preview deployment, that a customer incident occurred, or that Vercel configuration is currently incorrect.

## Decision

The final enterprise/public-production preflight requires one of these explicit URL sources:

- `RELEASE_DEPLOYMENT_URL`;
- `RELEASE_PRODUCTION_URL`;
- `NEXT_PUBLIC_APP_URL`;
- `NEXT_PUBLIC_SITE_URL`.

`VERCEL_URL` remains available to the platform and application where otherwise needed, but it is no longer accepted by this preflight as the sole production target signal.

The preflight evidence records `VERCEL_URL` only as an ambiguous rejected source label. It does not record URL values.

## Impact

A release workflow configured only with `VERCEL_URL` now fails closed before runtime release gates. Operators must configure an explicit production URL variable.

No runtime route, customer data, database schema, provider credential, deployment, DNS record, Vercel project setting, rollback target, or stored production evidence is changed by this decision.

## Risks and trade-offs

- Existing workflows relying only on `VERCEL_URL` will stop at preflight until an explicit production URL is configured.
- An explicitly configured URL can still be wrong; deployment smoke tests remain required to verify reachability and behavior.
- This change strengthens target intent but does not prove DNS ownership, production traffic, promotion state, or customer-facing availability.

## Tests and evidence

Repository regression coverage verifies that the accepted source set excludes `VERCEL_URL` and that remediation distinguishes production from preview deployments.

GitHub Actions and Vercel checks on the pull request are the authoritative execution evidence. No check is represented as passed before GitHub reports it green on the final head SHA.

## Rollback

Revert the pull request. No data, credential, provider, DNS, deployment, or infrastructure rollback is required. Reverting restores acceptance of `VERCEL_URL` as a release-target configuration signal.
