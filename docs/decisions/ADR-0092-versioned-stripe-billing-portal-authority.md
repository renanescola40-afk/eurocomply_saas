# ADR-0092: Version Stripe Billing Portal configuration authority with the application

- Status: Accepted
- Date: 2026-08-15
- Owners: Billing Engineering / Security Engineering

## Context

RISCK COMPLY creates Stripe Customer Portal sessions from the authenticated Billing surface. The application previously omitted the `configuration` field, so Stripe selected the account default Customer Portal configuration.

A provider proof separately validated that a live default configuration existed. Introducing an optional configuration ID only through provider environment variables would create a split authority: the application deployment and the protected GitHub proof could hold different values and both appear locally valid. That would allow evidence to describe a configuration other than the one used by production sessions.

The Billing Portal configuration ID is a provider resource identifier, not a credential. It can therefore be versioned with the source code without placing a secret in Git. Provider credentials, signing secrets and customer identifiers remain outside the repository.

The connected provider API available to the engineering agent exposes Billing Portal configuration reads but not the create mutation. Stripe's public API does support `POST /v1/billing_portal/configurations`, so an authorized protected workflow can close that provider gap without requiring a console-only configuration path.

## Decision

1. `config/stripe-billing-portal-contract.json` is the single source of truth for Billing Portal configuration selection.
2. The contract schema is `risck-comply.stripe-billing-portal-contract.v1`.
3. `configurationId: null` means the application intentionally omits Stripe's `configuration` session parameter and relies on the active live account default.
4. A non-null value must match the Stripe Billing Portal configuration identifier form `bpc_...`. The application passes that exact ID to `stripe.billingPortal.sessions.create`.
5. Malformed contract schema or identifier fails closed before a Stripe Portal Session is created.
6. `config/stripe-billing-portal-policy.json` is the reviewed feature policy for any provider configuration used by RISCK COMPLY.
7. The reviewed policy enables billing-address/tax-ID maintenance, invoice history and payment-method maintenance while keeping subscription update and cancellation disabled in Stripe Portal. Subscription lifecycle remains application-controlled so RBAC, step-up, idempotency, audit and lifecycle evidence cannot be bypassed through the provider UI.
8. Stripe Provider Proof reads the same checked-out binding contract and feature policy from the exact release SHA. It validates the exact pinned configuration when non-null; otherwise it requires an active live account-default configuration matching the feature policy.
9. Runtime audit metadata and retained provider evidence record only the binding mode (`explicit` or `default`) and do not retain the raw configuration ID.
10. No Vercel variable, GitHub variable, browser value, query parameter, session value or tenant data may override the repository contract.
11. `.github/workflows/stripe-billing-portal-bootstrap.yml` is the only repository-provided provider-mutation path for creating a managed RISCK COMPLY Billing Portal configuration. It is manual, protected by the `production` GitHub environment, requires exact-current-main provenance and an explicit confirmation phrase, and receives only read permission to repository contents.
12. The bootstrap workflow may create or reuse only the managed Billing Portal configuration described by the reviewed policy. It may not mutate customers, subscriptions, Checkout Sessions or payment objects, may not update the application contract, and may not commit, push, create a PR or merge.
13. The bootstrap operation is idempotent. It reuses one active managed configuration only when the complete feature policy matches. Multiple managed configurations or policy drift fail closed rather than triggering an automatic provider edit.

## Ownership and change control

- Billing Engineering owns the repository binding contract, feature policy and application behavior.
- Stripe provider state remains an external operational dependency.
- Changing the feature policy, changing from default to an explicit `bpc_...`, changing the pinned ID, or returning to default requires an ordinary reviewed pull request and the normal protected deployment path.
- The production bootstrap workflow requires the current reviewed `main` SHA, the protected `production` environment and the exact confirmation phrase `PROVISION_STRIPE_BILLING_PORTAL_CONFIGURATION`.
- The `bpc_...` returned by bootstrap is operational handoff data, not a secret. It must still be reviewed and pinned through a separate ordinary pull request; bootstrap cannot change runtime authority by itself.
- Provider proof must be rerun for the exact deployed SHA after a contract change.
- Production webhook secret binding, deployment orchestration and provider-environment governance remain outside this Billing code path.

## Rollout

The initial binding contract uses `configurationId: null`, preserving the existing default-configuration behavior with no new production environment variable.

### Phase 1 — provision provider object

1. Merge the reviewed bootstrap/policy implementation through normal branch protection.
2. From the exact current `main` SHA, manually dispatch **Stripe Billing Portal Bootstrap** in the protected `production` environment.
3. Enter `PROVISION_STRIPE_BILLING_PORTAL_CONFIGURATION` as the confirmation value.
4. The workflow validates the exact current main SHA and the live Stripe credential.
5. If one managed active configuration already exists, reuse it only when its policy is identical.
6. Otherwise create one active live configuration from `config/stripe-billing-portal-policy.json` with an idempotency key derived from the reviewed policy.
7. Re-read the created configuration from Stripe and fail if live mode, activity, identifier, management metadata or feature policy does not match.
8. The workflow publishes the resulting `bpc_...` only in the operator handoff summary. No evidence artifact or repository write is produced.

### Phase 2 — bind application authority

1. Review the provisioned `bpc_...` and update `config/stripe-billing-portal-contract.json` through a normal pull request.
2. Run repository CI/security gates and independent review on the exact PR head.
3. Human-merge only after branch protection accepts the exact head.
4. Deploy the exact merged SHA through the governed release process.
5. Run Stripe Provider Proof for that exact deployed SHA. The proof must confirm the pinned live configuration and the complete reviewed feature policy.
6. Run the relevant authenticated Billing runtime proof when real live subscription authority exists.

A provider object alone does not change runtime authority. A repository merge alone does not prove the provider object exists or that production has deployed the SHA.

## Consequences

### Positive

- Application runtime and provider proof consume one versioned configuration authority.
- A GitHub/Vercel environment-variable mismatch cannot select different Customer Portal configurations.
- Provider features are reviewable rather than being an undocumented Dashboard state.
- Direct provider subscription mutation remains disabled, preserving application lifecycle controls.
- Explicit configuration selection becomes reviewable and tied to source provenance.
- The provider object can be provisioned through a protected, repeatable and idempotent operation without granting workflow repository-write or merge authority.
- Evidence can state binding/policy results without retaining provider identifiers.

### Risks and limitations

- The bootstrap workflow performs a real live Stripe configuration mutation and therefore requires protected production approval and explicit confirmation.
- A successful bootstrap still requires a second reviewed PR to pin the returned ID before production sessions use it.
- Rotating to a different explicit Billing Portal configuration requires code review/deployment rather than a console-only variable change.
- `configurationId: null` still depends on Stripe maintaining one usable active live default configuration matching the feature policy.
- The bootstrap intentionally does not edit an existing managed configuration that drifted; a replacement/change must be reviewed deliberately.
- Provider proof does not substitute for signed webhook delivery, payment settlement, live subscription authority, lifecycle mutation evidence or production deployment evidence.

## Validation

Repository tests require:

- valid binding schema and `bpc_...` validation;
- fail-closed behavior for malformed binding contracts;
- default fallback when `configurationId` is null;
- explicit session configuration when a valid ID is selected;
- a valid feature-policy schema, canonical return host and bounded customer-update fields;
- subscription update/cancel disabled in the provider policy;
- provider proof reading the same binding contract and feature policy;
- provider proof requiring the selected live configuration to match the reviewed policy;
- bootstrap exact-current-main provenance, read-only GitHub permission, explicit confirmation and live-key requirement;
- bootstrap idempotency, bounded provider responses, redirect rejection and post-create verification;
- bootstrap refusal to mutate customer/subscription/payment resources or repository state;
- absence of a second `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` environment authority;
- redaction of raw configuration IDs from audit metadata and retained provider evidence.

Protected provider proof then verifies the selected contract and feature policy against Stripe live state for the exact release SHA.

## Rollback

Before an explicit ID is bound, the bootstrap-created provider object is inert with respect to application session selection. Do not delete it merely to make evidence cleaner.

To roll back an explicit configuration selection, submit a reviewed change setting `configurationId` back to `null` and deploy that exact SHA. This restores account-default selection.

Only after no deployed release pins a managed configuration may an authorized operator deactivate or remove that provider object through a separately reviewed provider-management action.

To remove this architecture entirely, revert the binding contract, feature policy, resolver, bootstrap, provider-proof and documentation changes together. No database migration or tenant-data rollback is involved. Provider objects are not deleted by application rollback.
