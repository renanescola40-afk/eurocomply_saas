# SAML SSO Runtime Proof Runbook

## Purpose

Prove that a real external identity provider completes a production SAML SSO login through the exact current release, active Enterprise entitlement, audit trail and seat-aware provisioning path.

## Dedicated proof resources

Use only a non-customer Enterprise test organization and a dedicated SAML connection. The connection must be active, domain-verified, bound to a Supabase SAML provider and covered by an active contract with SSO enabled.

GitHub environment: `production-identity-proof`

Protected values:

- `PRODUCTION_URL`: canonical HTTPS production origin.
- `HEALTHCHECK_TOKEN`: bearer token for `/api/ready/release`.
- `SUPABASE_SERVICE_ROLE_KEY`: production service credential, environment-secret only.
- `SAML_PROOF_CONNECTION_ID`: UUID of the dedicated test connection, environment-secret only.

Environment variable:

- `NEXT_PUBLIC_SUPABASE_URL`: canonical HTTPS Supabase project origin.
- `SAML_PROOF_TIMEOUT_MS`: optional wait window from 60,000 to 1,200,000 ms; default 900,000 ms.

## Execute

1. Confirm the candidate commit is the exact current `main` SHA and production has deployed it.
2. Open **Actions → SAML SSO Runtime Proof → Run workflow**.
3. Enter the full SHA.
4. Enter `EXECUTE_SAML_SSO_RUNTIME_PROOF`.
5. Approve the `production-identity-proof` environment.
6. When the job says it is waiting, complete a new login using the dedicated SAML test account.
7. Retain `saml-sso-runtime-proof-<sha>` for 365 days.
8. Confirm `saml-sso-runtime-validation.json` is `Complete/passed` and validate `SHA256SUMS`.

## Accepted login outcomes

The proof accepts only successful provisioning states:

- `reserved`
- `already_active`
- `seat_changed`
- `duplicate`
- `existing_membership`

Capacity denial, missing pre-provisioning, inactive contract, missing entitlement, provider mismatch or absent audit evidence fails the proof.

## Failure handling

- Runtime SHA mismatch: deploy the requested current `main` SHA; never override the comparison.
- `401/403` from readiness or Supabase: repair the protected secret or environment access; do not paste secrets into inputs or logs.
- Connection not active: repair provider/domain verification and activate the dedicated connection.
- Entitlement not active: reconcile the dedicated test contract and SSO entitlement.
- Login not observed: verify that the test account used the configured SAML connection after the workflow baseline.
- Provisioning rejected: reconcile member/seat/admin capacity or pre-provision the test identity.
- Provider mismatch: inspect sanitized auth and audit telemetry using the workflow run ID; do not export assertions.
- Artifact redaction failure: treat the run as invalid and rotate any value that may have been exposed.

## Evidence boundary

A green run proves one newly completed production SAML login for the configured proof connection and exact deployed SHA. It is not provider certification and must not be represented as universal Entra, Okta or customer-specific acceptance.
