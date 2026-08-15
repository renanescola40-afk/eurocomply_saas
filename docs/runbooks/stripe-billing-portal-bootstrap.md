# Stripe Billing Portal bootstrap

## Purpose

Provision one live RISCK COMPLY-managed Stripe Billing Portal configuration from a reviewed repository policy without using a console-only, undocumented feature state.

This operation does **not** create customers, subscriptions, Checkout Sessions, invoices, payments or entitlement authority. It does **not** update the application binding contract and it does **not** prove end-to-end Billing runtime behavior.

## Authority files

- Runtime binding: `config/stripe-billing-portal-contract.json`
- Provider feature policy: `config/stripe-billing-portal-policy.json`
- Provider bootstrap: `scripts/ops/provision-stripe-billing-portal-config.mjs`
- Protected workflow: `.github/workflows/stripe-billing-portal-bootstrap.yml`
- Provider verification: `.github/workflows/stripe-provider-proof.yml`
- Decision: `docs/decisions/ADR-0092-versioned-stripe-billing-portal-authority.md`

## Reviewed feature policy

The managed Portal configuration intentionally allows only customer-controlled billing maintenance that does not bypass RISCK COMPLY subscription lifecycle authority:

- billing address and tax-ID updates: enabled;
- invoice history: enabled;
- payment-method update: enabled;
- direct Stripe Portal subscription cancellation: disabled;
- direct Stripe Portal subscription update: disabled.

Upgrade, scheduled downgrade, cancel and reactivate remain application-controlled so tenant RBAC, billing step-up, idempotency, durable lifecycle records and audit evidence remain authoritative.

## Preconditions

1. The bootstrap/policy implementation is merged to protected `main`.
2. The SHA supplied to the workflow is the **exact current main SHA**, not merely an ancestor.
3. The GitHub `production` environment enforces its normal protection/review requirements.
4. `STRIPE_SECRET_KEY` exists in that environment and is a live-mode secret or restricted key with permission to list/retrieve/create Billing Portal configurations.
5. `config/stripe-billing-portal-policy.json` has passed repository review and CI.
6. No parallel provider change is intentionally creating another RISCK COMPLY-managed Portal configuration.

## Execute phase 1 — provider bootstrap

Open **Actions → Stripe Billing Portal Bootstrap → Run workflow** and provide:

- `release_sha`: exact current 40-character `main` SHA;
- `confirmation`: `PROVISION_STRIPE_BILLING_PORTAL_CONFIGURATION`.

The workflow then:

1. checks out `main` history with credentials disabled;
2. requires `release_sha` to equal the current remote `main` SHA;
3. runs only in the protected `production` environment;
4. validates a live Stripe credential without printing it;
5. lists active Billing Portal configurations;
6. identifies managed configurations only by the reviewed metadata marker;
7. fails if more than one active managed configuration exists;
8. reuses one managed configuration only when the complete reviewed policy matches;
9. otherwise creates one configuration with an idempotency key derived from the reviewed policy;
10. retrieves the resulting object again and validates live mode, active state, ID, feature policy and management metadata;
11. writes the resulting `bpc_...` only to the workflow operator summary/output.

No artifact containing the provider payload is retained.

## Execute phase 2 — bind the reviewed ID

The bootstrap result does not change runtime behavior by itself.

1. Copy the returned non-secret `bpc_...` identifier from the workflow summary.
2. Verify the object is the expected managed live configuration.
3. Create a normal branch from current `main`.
4. Change only `config/stripe-billing-portal-contract.json` from `configurationId: null` (or the prior reviewed ID) to the new exact `bpc_...` value, plus any directly required evidence/documentation updates.
5. Run all Billing/provider contract tests and normal required repository checks.
6. Obtain independent review and resolve every P0/P1 review thread.
7. Human-merge only when branch protection accepts the exact final head.
8. Deploy the exact merged SHA through the governed release process.
9. Run **Stripe Provider Proof** for the exact deployed SHA.
10. Require `billingPortalConfigurationPresent`, `billingPortalConfigurationBindingValid`, and `billingPortalConfigurationPolicyMatches` to pass.

## Failure handling

### Confirmation mismatch

Do not retry with altered code. Re-run with the exact required confirmation only after confirming the intended current-main policy.

### Non-live or missing Stripe key

Do not put a key in repository files or workflow inputs. Correct the protected `production` environment credential through the provider/secret owner.

### More than one managed configuration

Stop. Do not let automation pick one and do not automatically deactivate either object. Inspect provider history and determine which configuration, if any, is safe to retain.

### Existing managed configuration drift

Stop. The bootstrap intentionally does not patch a live object that may already be in use. Review the policy difference and choose either a deliberate provider update or a new reviewed configuration path.

### Stripe API timeout, redirect, oversized or malformed response

Treat the operation as unverified. Re-run only after checking Stripe/provider health. The script is idempotent: if creation succeeded but the response path failed, a later run should discover the managed object by metadata rather than intentionally creating another one.

### Provider Proof fails after binding

Do not edit retained evidence. Reconcile the actual Stripe object, the versioned binding, the feature policy and the deployed SHA, then execute a new exact-SHA proof.

## Rollback

If the provider object was created but never pinned, application runtime selection is unchanged.

If an explicit configuration was pinned and must be rolled back:

1. submit a reviewed contract change to the previously accepted configuration or `configurationId: null`;
2. human-merge through normal checks;
3. deploy that exact SHA;
4. rerun Stripe Provider Proof.

Do not deactivate/delete a provider configuration while any deployed release can still reference it.

## Evidence boundary

A successful bootstrap proves only that one live provider configuration was created/reused and matched the reviewed feature policy at that operation.

A successful Stripe Provider Proof after binding proves that the exact deployed source contract selects an active live configuration matching the reviewed policy.

Neither result proves:

- production webhook signing-secret binding;
- a real signed webhook 2xx delivery;
- a processed live Stripe event in the durable ledger;
- subscription persistence or entitlement activation;
- payment settlement;
- replay suppression or invoice reconciliation;
- live upgrade, scheduled downgrade, cancel or reactivate;
- Enterprise/SCIM production schema promotion.

Those remain separate runtime acceptance requirements tracked by #1609 and #1610.
