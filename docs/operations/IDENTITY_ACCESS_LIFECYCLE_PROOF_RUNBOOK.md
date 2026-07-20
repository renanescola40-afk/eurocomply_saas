# Identity access lifecycle proof runbook

## Ownership

- Approver: production identity owner.
- Executor: GitHub Actions workflow `Identity Access Lifecycle Proof`.
- Reviewer: independent security or repository owner.

## Protected configuration

Secrets:
- `PRODUCTION_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IDENTITY_PROOF_EMAIL_DOMAIN`
- `IDENTITY_PROOF_OIDC_DISCOVERY_URL`

Protected environment variables, set to `true` only after their corresponding controls are configured and independently reviewed:
- `IDENTITY_ADMIN_MFA_REQUIRED`
- `IDENTITY_SENSITIVE_STEP_UP_REQUIRED`
- `IDENTITY_ORGANIZATION_ONBOARDING_VALIDATED`

## Procedure

1. Confirm the workflow will execute on the current `main` SHA.
2. Confirm disposable signup is permitted for the proof domain.
3. Confirm the service role is available only in the protected environment.
4. Run the workflow and type `EXECUTE_IDENTITY_LIFECYCLE_PROOF`.
5. Approve the protected environment.
6. Review signup, login, refresh, recovery, logout, revocation, OAuth fail-closed and OIDC checks.
7. Confirm disposable account cleanup succeeded.
8. Run the strict evidence validator before scorecard promotion.

## Abort conditions

Abort when production is under active identity incident, the disposable domain is not controlled, cleanup privileges are unavailable, an MFA/step-up/onboarding attestation has not been independently reviewed, or the OIDC discovery endpoint does not belong to the configured provider.

## Acceptance

Evidence must be `Complete/passed`, exact-SHA bound, contain no failures, prove account cleanup and contain no identity secrets or provider responses.
