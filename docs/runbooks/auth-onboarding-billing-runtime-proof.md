# Auth, onboarding and billing runtime proof

## Purpose

Run one protected, read-only proof that observes the production path from completed onboarding through active Stripe-backed access and chained audit evidence. The proof is bound to the exact current `main` SHA and never mutates tenant data.

## Preconditions

- the target deployment corresponds to the exact current `main` SHA;
- the GitHub environment (`staging` or `production`) requires the appropriate reviewers;
- `SUPABASE_DB_POOLER_URL` is configured as an environment secret;
- the selected organization is explicitly authorized for evidence collection;
- onboarding was completed through the real application flow;
- the organization has an active or trialing Stripe subscription;
- a successfully processed Stripe event is available;
- the canonical chained audit ledger is enabled.

## Workflow inputs

Open **Actions → Auth Onboarding Billing Runtime Proof → Run workflow** and provide:

- `release_sha`: full 40-character SHA currently at `main`;
- `target_environment`: `staging` or `production`;
- `organization_id`: authorized organization UUID;
- `stripe_event_id`: successfully processed `evt_...` identifier;
- `expected_plan`: canonical plan such as `professional`;
- `confirmation`: `PROVE_AUTH_ONBOARDING_BILLING_RUNTIME`.

## Observed controls

The workflow verifies:

1. onboarding, subscription, Stripe ledger and audit-chain schema prerequisites;
2. the atomic onboarding activation RPC exists;
3. the organization exists and has completed onboarding;
4. the organization-selected plan matches the expected plan;
5. a completed onboarding activation run exists for that plan;
6. the subscription is active or trialing;
7. subscription `plan` and `tier` match;
8. Stripe customer and subscription bindings exist;
9. entitlement data is present;
10. the correlated Stripe event is processed without error;
11. `webhook_received`, `billing.subscription_updated` and `subscription_synced` audit events exist;
12. the audit events use SHA-256 hashes and their predecessor links resolve.

## Artifact handling

The raw SQL observation is temporary and deleted before artifact upload. Retained files contain only:

- control booleans;
- exact release SHA and workflow run ID;
- bounded environment and expected-plan metadata;
- organization and Stripe-event suffixes;
- source SHA-256 and byte length;
- truth-boundary text.

No database URL, credential, service-role secret, full organization UUID, full Stripe event ID or raw row is retained.

## Failure handling

The proof remains `Open/failed` when any control is absent. Use the generated summary to identify the exact failed control.

Common failures:

- `schemaReady`: apply the approved migrations and refresh the PostgREST schema cache;
- `organizationOnboardingCompleted`: complete the real onboarding flow;
- `activationRunObserved`: verify the atomic activation RPC was used successfully;
- `subscriptionActive`: correct or renew the Stripe subscription;
- `subscriptionPlanMatches`: reconcile Stripe metadata and the canonical subscription row;
- `stripeEventProcessed`: inspect the webhook delivery and `stripe_events_processed` failure reason;
- audit failures: inspect `audit_events` and the chained append RPC.

Do not edit the evidence artifact to turn a failed control green. Correct the runtime state and execute a new workflow run for the exact current SHA.

## Rollback

This workflow is read-only. Rollback consists of disabling or removing the workflow and associated scripts. No database rollback is required. Revoking the environment secret immediately prevents future executions.

## Truth boundary

A green result proves the observed path for one pre-authorized organization at one point in time and one exact release SHA. It does not prove every tenant, future deployments, payment settlement, legal compliance, external certification or universal availability.
