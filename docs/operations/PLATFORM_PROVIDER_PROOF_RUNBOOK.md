# Platform provider proof runbook

## Purpose

Execute a protected production validation of Stripe, email, Sentry, distributed rate limiting and provider-failure classification without storing customer data or provider payloads.

## Required protected secrets

- `PRODUCTION_URL`
- `PLATFORM_PROOF_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENTRY_DSN`

The internal platform-proof endpoints must accept only the protected token, apply no-store, enforce bounded synthetic operations and reject arbitrary recipients or customer identifiers.

## Procedure

1. Open Actions → Platform Providers Runtime Proof.
2. Run the workflow from `main`.
3. Approve the `production-platform-proof` environment.
4. Confirm checkout and subscription proof routes succeed.
5. Confirm a correctly signed synthetic webhook succeeds.
6. Confirm replaying the same event succeeds without duplicate side effects.
7. Confirm an invalid signature is rejected.
8. Confirm the controlled email probe succeeds.
9. Confirm Sentry ingestion and release binding succeed.
10. Confirm the bounded rate-limit burst produces at least one HTTP 429.
11. Download only the redacted JSON evidence artifact.
12. Run the strict evidence validator before scorecard promotion.

## Abort conditions

Abort when the workflow is not on the exact `main` SHA, the environment is not protected, the proof token can access arbitrary production actions, the email probe permits arbitrary recipients, webhook events can create billable customer state, or any response body/credential is written to evidence.

## Acceptance

Evidence is acceptable only when every canonical check is true, the SHA is exact, failures are empty and all evidence-integrity flags confirm that sensitive values were excluded.
