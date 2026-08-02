# ADR: Exact-SHA auth, onboarding and billing runtime proof

- Date: 2026-08-02
- Status: Accepted
- Scope: identity, onboarding, billing access gate and production evidence

## Context

Repository tests and the existing identity lifecycle proof validate authentication primitives, callback behavior and disposable account cleanup. The onboarding portion, however, could be credited through an operator-maintained boolean variable. Recent production work also showed that code-level success did not guarantee the target database had the expected onboarding and billing columns, constraints or runtime state.

The release path needs one repeatable technical proof that directly observes:

- completed onboarding state;
- atomic activation evidence;
- active Stripe-backed subscription access;
- processed webhook correlation;
- chained audit evidence;
- the exact current `main` SHA.

## Decision

Introduce a protected manual workflow that connects to the target Supabase database through the existing pooler secret and performs read-only SQL observation for one explicitly authorized organization.

The workflow:

1. requires the full current `main` SHA and a literal confirmation phrase;
2. validates organization, Stripe-event and plan input formats;
3. uses a protected staging or production environment;
4. checks out and verifies the exact current `main` commit;
5. runs only `SELECT`-based SQL;
6. validates schema, onboarding, activation, subscription, webhook and audit-chain controls;
7. converts the temporary observation into sanitized evidence;
8. deletes the raw observation before artifact upload;
9. fails closed unless every required control is true;
10. retains the bounded evidence artifact for 90 days.

## Alternatives considered

### Continue using an environment boolean

Rejected. An operator assertion is not runtime evidence and can remain true after a deployment or database regression.

### Automate a complete production onboarding mutation

Rejected for the closing proof. Creating organizations, AI systems, tasks, documents, invitations and subscriptions would introduce production mutations and cleanup complexity. The selected design observes a pre-authorized real flow instead.

### Depend only on browser E2E

Rejected as insufficient. Browser behavior does not independently prove database idempotency, Stripe event processing or chained audit persistence.

### Store raw SQL rows as artifacts

Rejected because tenant and billing identifiers would be unnecessarily retained.

## Consequences

### Positive

- onboarding can no longer be credited by a boolean flag;
- evidence is exact-SHA and tied to the target environment;
- one proof covers the critical auth-to-paid-access chain;
- failures identify the missing runtime control;
- raw tenant rows and credentials are not retained;
- the workflow is read-only and requires no database rollback.

### Negative

- an authorized organization with completed onboarding and active billing must exist;
- the proof can fail after a legitimate plan or organization change until inputs are updated;
- it proves only the selected organization at the execution time;
- environment approval and secret maintenance remain operational dependencies.

## Rollback

Remove the workflow, SQL, builder, validator and associated tests/docs. Revoke `SUPABASE_DB_POOLER_URL` from the proof environment to stop execution immediately. No database state is modified by this decision.

## Truth boundary

A successful proof supports technical runtime acceptance for the observed organization and exact SHA. It is not universal tenant proof, payment settlement evidence, a legal conclusion, certification or a guarantee of future availability.
