# Canonical Auth/RBAC scorecard evidence

- Date: 2026-07-16
- Status: Accepted
- Scope: protected Auth/RBAC runtime proof and Enterprise Readiness Scorecard integration

## Context

The protected Auth/RBAC workflow already authenticates three synthetic users, observes owner/member roles, verifies same-tenant access, denies cross-tenant organization and membership reads, and revokes the synthetic sessions. It writes `auth-rbac-final-validation.json`.

The enterprise scorecard, however, reads a separate canonical artifact named `auth-rbac-validation.json` and requires seven named checks:

- `signup`;
- `login`;
- `logout`;
- `sessionRefresh`;
- `oauthCallback`;
- `rbac`;
- `organizationOnboarding`.

The source proof and scorecard therefore had incompatible schemas. Copying the source document or marking every identity control complete would overstate what was actually executed.

## Decision

A fail-closed derivation step now converts trusted source runtime evidence into the canonical scorecard schema.

Only controls directly demonstrated by the existing synthetic flow may pass:

- `login` passes when the fixtures authenticate and expected roles are observed;
- `logout` passes when every synthetic session is revoked;
- `rbac` passes only when roles, same-tenant reads, cross-tenant denials, and membership hiding all pass.

The following remain `NOT_VERIFIED` until dedicated disposable-flow validations are implemented and executed:

- `signup`;
- `sessionRefresh`;
- `oauthCallback`;
- `organizationOnboarding`.

The derived artifact becomes `Complete` only when every canonical check explicitly passes. Partial evidence remains `Open`, reports `outcome: partial`, and blocks enterprise production.

## Trust requirements

The source evidence is trusted only when it:

1. uses the expected schema and evidence item;
2. reports `Complete/passed`;
3. originates from the canonical repository and `main` branch;
4. is bound to a full exact SHA whose checkout matches;
5. records GitHub Actions provenance and a numeric run ID;
6. contains no failures;
7. confirms that credentials, tokens, users, organizations, and raw provider responses were not stored.

Any missing trust condition prevents every derived control from passing.

## Workflow integration

The protected workflow now:

1. executes the existing live validation;
2. validates the source evidence contract;
3. derives `auth-rbac-validation.json`;
4. validates the canonical scorecard contract;
5. uploads both redacted artifacts under the exact release SHA.

## Consequences

- Existing runtime proof can truthfully close the identity controls it already demonstrates.
- The scorecard no longer depends on an absent or incompatible file.
- Missing signup, refresh, OAuth, and onboarding proof remains visible instead of being hidden behind a passing parent document.
- A later workflow can extend the source proof without changing scorecard semantics.

## Evidence boundary

This integration does not execute provider configuration, OAuth, signup, refresh, or onboarding by itself. It never converts static inspection into runtime proof and never stores synthetic credentials or identifiers.

## Rollback

Revert the associated pull request. The scorecard will again treat the canonical Auth/RBAC evidence as missing, while the existing source runtime workflow remains available independently.
