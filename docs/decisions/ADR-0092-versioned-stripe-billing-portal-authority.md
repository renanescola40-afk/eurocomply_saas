# ADR-0092: Version Stripe Billing Portal configuration authority with the application

- Status: Accepted
- Date: 2026-08-15
- Owners: Billing Engineering / Security Engineering

## Context

RISCK COMPLY creates Stripe Customer Portal sessions from the authenticated Billing surface. The application previously omitted the `configuration` field, so Stripe selected the account default Customer Portal configuration.

A provider proof separately validated that a live default configuration existed. Introducing an optional configuration ID only through provider environment variables would create a split authority: the application deployment and the protected GitHub proof could hold different values and both appear locally valid. That would allow evidence to describe a configuration other than the one used by production sessions.

The Billing Portal configuration ID is a provider resource identifier, not a credential. It can therefore be versioned with the source code without placing a secret in Git. Provider credentials, signing secrets and customer identifiers remain outside the repository.

## Decision

1. `config/stripe-billing-portal-contract.json` is the single source of truth for Billing Portal configuration selection.
2. The contract schema is `risck-comply.stripe-billing-portal-contract.v1`.
3. `configurationId: null` means the application intentionally omits Stripe's `configuration` session parameter and relies on the active live account default.
4. A non-null value must match the Stripe Billing Portal configuration identifier form `bpc_...`. The application passes that exact ID to `stripe.billingPortal.sessions.create`.
5. Malformed contract schema or identifier fails closed before a Stripe Portal Session is created.
6. Stripe Provider Proof reads the same checked-out contract from the exact release SHA. It validates the exact pinned configuration when non-null; otherwise it requires an active live account-default configuration.
7. Runtime audit metadata and retained provider evidence record only the binding mode (`explicit` or `default`) and do not retain the raw configuration ID.
8. No Vercel variable, GitHub variable, browser value, query parameter, session value or tenant data may override the repository contract.

## Ownership and change control

- Billing Engineering owns the repository contract and application behavior.
- Stripe provider state remains an external operational dependency.
- Changing from default to an explicit `bpc_...`, changing the pinned ID, or returning to default requires an ordinary reviewed pull request and the normal protected deployment path.
- Provider proof must be rerun for the exact deployed SHA after a contract change.
- Production secret binding, deployment orchestration and provider-environment governance remain outside this Billing code path.

## Rollout

The initial contract uses `configurationId: null`, preserving the existing default-configuration behavior with no new production environment variable.

To adopt an explicit configuration later:

1. create or identify the intended active live Billing Portal configuration in Stripe through an authorized provider-management path;
2. update `config/stripe-billing-portal-contract.json` to the exact reviewed `bpc_...` ID;
3. run repository CI/security gates;
4. deploy the exact merged SHA through the governed release process;
5. run Stripe Provider Proof for that exact SHA;
6. run the relevant authenticated Billing runtime proof when real live subscription authority exists.

A repository merge alone does not prove the provider object exists or that production has deployed the SHA.

## Consequences

### Positive

- Application runtime and provider proof consume one versioned configuration authority.
- A GitHub/Vercel environment-variable mismatch cannot select different Customer Portal configurations.
- Explicit configuration selection becomes reviewable and tied to source provenance.
- Default behavior remains available without introducing a new runtime dependency.
- Evidence can state the binding mode without retaining provider identifiers.

### Risks and limitations

- Rotating to a different explicit Billing Portal configuration requires a code review/deployment rather than a console-only variable change.
- `configurationId: null` still depends on Stripe maintaining one usable active live default configuration.
- The repository contract cannot create or mutate the Stripe configuration itself.
- Provider proof does not substitute for signed webhook delivery, payment settlement, live subscription authority, lifecycle mutation evidence or production deployment evidence.

## Validation

Repository tests require:

- valid schema and `bpc_...` validation;
- fail-closed behavior for malformed contracts;
- default fallback when `configurationId` is null;
- explicit session configuration when a valid ID is selected;
- provider proof reading the same repository contract;
- absence of a second `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` environment authority;
- redaction of raw configuration IDs from audit metadata and retained provider evidence.

Protected provider proof then verifies the selected contract against Stripe live state for the exact release SHA.

## Rollback

To roll back an explicit configuration selection, submit a reviewed change setting `configurationId` back to `null` and deploy that exact SHA. This restores account-default selection.

To remove this architecture entirely, revert the contract, resolver, provider-proof and documentation changes together. No database migration or tenant-data rollback is involved. Provider objects are not deleted by application rollback.
