# SCIM Runtime Proof Runbook

## Purpose

Run a destructive-but-bounded SCIM Users and Groups lifecycle against a dedicated Enterprise test organization and retain redacted exact-SHA evidence.

## Required protected environment

GitHub environment: `production-identity-proof`

Secrets:

- `PRODUCTION_URL`: canonical HTTPS production origin.
- `SCIM_PROOF_BEARER_TOKEN`: show-once SCIM credential for a dedicated non-customer test organization.
- `SCIM_PROOF_EMAIL_DOMAIN`: controlled domain accepted for disposable proof identities.

The test organization must have an active Enterprise contract, SCIM entitlement, one available viewer seat and no customer data.

## Execute

1. Confirm the candidate commit is the exact current `main` SHA.
2. Open **Actions → SCIM Runtime Proof → Run workflow**.
3. Enter the full SHA.
4. Enter `EXECUTE_SCIM_RUNTIME_PROOF`.
5. Approve the protected environment.
6. Retain `scim-runtime-proof-<sha>` for 365 days.
7. Confirm `scim-runtime-validation.json` is `Complete/passed` and `SHA256SUMS` validates.

## What the workflow changes

The workflow creates one disposable viewer identity and one Group. It deletes the Group and deprovisions the User. The inactive identity record may remain for audit and idempotency history, but it must not consume an active seat.

## Failure handling

- Missing/invalid secrets: configure the protected environment; never paste credentials into workflow inputs.
- `401/403`: rotate the dedicated SCIM token and verify its organization binding.
- `409` or seat exhaustion: reconcile the test contract, pending invitations and viewer capacity.
- `429/503`: verify the distributed rate-limit backend; do not bypass fail-closed controls.
- `500`: inspect sanitized application/Sentry events using the workflow run ID; do not store raw provider payloads.
- Cleanup failure: manually deprovision the generated test identity in the dedicated tenant before rerun.

## External follow-up

After this proof passes, run real Microsoft Entra ID and Okta acceptance exercises for SAML login plus SCIM Users/Groups. Retain separate provider-issued/test-run evidence. A green synthetic SCIM proof is not provider certification.
