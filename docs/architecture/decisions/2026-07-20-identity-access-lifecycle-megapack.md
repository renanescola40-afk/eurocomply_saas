# Identity and access lifecycle exact-SHA megapack

- Status: Proposed
- Date: 2026-07-20
- Scope: signup, login, refresh, logout, recovery, OAuth callback, OIDC, MFA, step-up and onboarding evidence

## Context

Identity controls cannot be promoted from route existence or static configuration alone. Enterprise acceptance requires protected runtime proof, exact-SHA binding, disposable identities, mandatory cleanup and explicit evidence boundaries.

## Decision

Use one protected manual workflow that creates a synthetic account, validates the complete authentication lifecycle, verifies revoked-session denial, exercises the production OAuth callback in a fail-closed negative case, validates OIDC discovery, and records protected policy attestations for administrator MFA, sensitive-action step-up and organization onboarding.

## Safety

- Runs only through `workflow_dispatch` in `production-identity-proof`.
- Requires exact typed confirmation and exact `main` SHA.
- Uses random disposable credentials.
- Service role is restricted to cleanup.
- Cleanup failure blocks acceptance.
- Canonical evidence excludes credentials, email addresses, tokens, callback values and provider responses.

## Evidence boundary

A successful run proves the tested identity lifecycle and configured policy attestations on the exact release. It does not prove every third-party enterprise IdP, every mailbox delivery path or every browser variation.

## Rollback

Revert the workflow, scripts, validator, tests, runbook, evidence contract and this ADR together.
