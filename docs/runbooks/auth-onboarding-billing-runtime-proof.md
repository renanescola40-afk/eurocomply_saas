# Auth, onboarding and billing runtime proof

## Purpose

Run one protected, read-only proof that observes the target path from completed onboarding through Stripe-backed access and chained audit evidence. The proof is bound to the exact current `main` SHA and never mutates tenant data.

Production has a stricter commercial-authority boundary than staging: a production proof can only complete when the selected Stripe event is a processed **live-mode** `customer.subscription.created` or `customer.subscription.updated` event whose payload subscription and customer identifiers match the exact persisted subscription for the authorized organization. A status-only subscription row or a processed test-mode event cannot satisfy the production proof.

## Preconditions

- the target deployment corresponds to the exact current `main` SHA;
- the GitHub environment (`staging` or `production`) requires the appropriate reviewers;
- `SUPABASE_DB_POOLER_URL` is configured as an environment secret;
- the selected organization is explicitly authorized for evidence collection;
- onboarding was completed through the real application flow;
- the organization has an active or trialing Stripe subscription;
- a successfully processed authoritative Stripe subscription event is available;
- for `production`, that event is `livemode=true` and its payload customer/subscription binding matches the persisted organization subscription;
- the canonical chained audit ledger is enabled.

The separate **Stripe Provider Proof** must also be green before commercial launch. It validates the live account, canonical live monthly prices, exact production webhook contract, and the active live Billing Portal configuration used by runtime sessions. `config/stripe-billing-portal-contract.json` is the single configuration authority compiled into the same release SHA: `configurationId: null` intentionally uses the active live account default, while a reviewed non-null `bpc_...` value pins that exact configuration. The protected provider proof reads the same checked-out contract, so GitHub/Vercel environment drift cannot select a different portal configuration. Retained evidence records only whether the binding mode was `explicit` or `default`; it does not retain the configuration ID. See `docs/decisions/ADR-0092-versioned-stripe-billing-portal-authority.md`. A runtime organization proof does not substitute for provider configuration readiness.

## Workflow inputs

Open **Actions → Auth Onboarding Billing Runtime Proof → Run workflow** and provide:

- `release_sha`: full 40-character SHA currently at `main`;
- `target_environment`: `staging` or `production`;
- `organization_id`: authorized organization UUID;
- `stripe_event_id`: successfully processed authoritative subscription `evt_...` identifier;
- `expected_plan`: canonical plan such as `professional`;
- `confirmation`: `PROVE_AUTH_ONBOARDING_BILLING_RUNTIME`.

## Observed controls

The workflow verifies:

1. onboarding, subscription, Stripe ledger and audit-chain schema prerequisites;
2. the atomic onboarding activation RPC exists;
3. the organization exists and has completed onboarding;
4. the organization-selected plan matches the expected plan;
5. a completed onboarding activation run exists for that plan;
6. the subscription matched by the event payload is active or trialing;
7. subscription `plan` and `tier` match;
8. Stripe customer and subscription bindings exist;
9. entitlement data is present;
10. the correlated Stripe event is processed without error for the exact organization;
11. the event type is `customer.subscription.created` or `customer.subscription.updated`;
12. the event payload subscription and customer match the exact persisted subscription row;
13. in `production`, the event is explicitly `livemode=true`;
14. `webhook_received`, `billing.subscription_updated` and `subscription_synced` audit events exist;
15. the audit events use SHA-256 hashes and their predecessor links resolve.

Staging evidence can complete without claiming live-mode authority, but it still requires an authoritative subscription event type and exact event/customer/subscription correlation. The retained artifact records whether live authority was required so staging evidence cannot be mistaken for production commercial proof.

## Schema-drift reconciliation

The runtime proof reads rollout-sensitive columns through `to_jsonb(row)` so an absent optional column produces a truthful failed control instead of a PostgreSQL parse error. Missing schema is never treated as passed.

When `schemaReady` fails because `organizations.onboarding_status`, `organizations.onboarding_completed_at` or `organizations.selected_plan` is absent, apply the approved migration:

```text
supabase/migrations/20260802153000_reconcile_onboarding_runtime_schema.sql
```

The migration:

- adds the three columns idempotently;
- normalizes onboarding status values;
- backfills only from the latest completed `onboarding_activation_runs` row for the same organization;
- restores the canonical status constraint and index;
- does not delete, truncate or drop tenant data.

After applying it, confirm that the production schema contains the columns and execute a **new** proof against the exact current `main` SHA. Do not reuse evidence from an earlier SHA.

## Artifact handling

The raw SQL observation is temporary and deleted before artifact upload. Retained files contain only:

- control booleans;
- exact release SHA and workflow run ID;
- bounded environment and expected-plan metadata;
- organization and Stripe-event suffixes;
- the authority policy used for the selected environment;
- source SHA-256 and byte length;
- truth-boundary text.

No database URL, credential, service-role secret, full organization UUID, full Stripe event ID, Stripe customer ID, Stripe subscription ID, Billing Portal configuration ID or raw row is retained.

## Failure handling

The proof remains `Open/failed` when any required control is absent. Use the generated summary to identify the exact failed control.

Common failures:

- `schemaReady`: apply the approved migrations and refresh the PostgREST schema cache;
- `organizationOnboardingCompleted`: complete the real onboarding flow or reconcile the organization from a completed activation run;
- `organizationPlanMatches`: reconcile `organizations.selected_plan` from the latest completed activation run;
- `activationRunObserved`: verify the atomic activation RPC was used successfully;
- `subscriptionActive`: correct or renew the Stripe subscription;
- `subscriptionPlanMatches`: reconcile Stripe metadata and the canonical subscription row;
- `stripeEventProcessed`: inspect the webhook delivery and `stripe_events_processed` failure reason;
- `stripeEventAuthoritativeType`: use the processed subscription-created/updated event that grants commercial authority, not checkout/test evidence;
- `stripeEventBindingMatches`: investigate organization/customer/subscription correlation before granting access;
- `stripeEventLiveMode`: production cannot complete from test-mode Stripe evidence;
- provider proof `billingPortalConfigurationPresent`: configure an active live Customer Portal configuration in Stripe;
- provider proof `billingPortalConfigurationBindingValid`: compare `config/stripe-billing-portal-contract.json` with Stripe live state. `configurationId: null` requires a usable active live account default; a non-null reviewed `bpc_...` must name that exact active live configuration;
- audit failures: inspect `audit_events` and the chained append RPC.

Do not edit the evidence artifact to turn a failed control green. Correct the runtime/provider state and execute a new workflow run for the exact current SHA.

## Rollback

The proof workflow is read-only. Rollback consists of disabling or removing the workflow and associated scripts. Revoking the environment secret immediately prevents future executions.

The Billing Portal authority rollback is documented in ADR-0092. Setting the versioned contract back to `configurationId: null` through a reviewed PR restores account-default selection after that exact SHA is deployed.

The reconciliation migration is additive. Do not drop the onboarding columns while application code or runtime proofs depend on them. To reverse only its data backfill, restore the affected organization rows from the pre-migration backup while retaining the schema columns and constraints.

## Truth boundary

A green production result proves the observed path for one pre-authorized organization, one exact release SHA and one exact processed live authoritative Stripe subscription event. It does not prove every tenant, future deployments, payment settlement, legal compliance, external certification or universal availability. A green staging result does not claim live-mode Stripe authority.
