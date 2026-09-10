# ADR-0129: Align Vercel function execution with the EU Production data plane

## Status

Proposed for post-Beagle Production convergence. This ADR does not authorize merge, Production deployment, Vercel Production environment mutation, Supabase Production mutation, or release unfreeze.

## Context

RISCK COMPLY Production currently has a geographic split in its server-side request path:

- Supabase Production `tganhbbhfxcpblmgqprg` is hosted in `eu-west-1`;
- the canonical Vercel Production deployment observed during the active Beagle freeze executes server functions in `iad1`;
- authenticated `/api/ready` observations on that frozen deployment have returned bounded Supabase readiness timeouts;
- the readiness relations inspected in Production are small, and contemporaneous database samples showed normal commit progress without the historical rollback storm.

These observations make cross-region network distance a material reliability factor worth removing. They do not prove that region distance is the sole root cause of the observed readiness timeouts.

The active Beagle assessment requires the currently tested Production runtime to remain unchanged. Therefore the implementation is prepared and tested in a branch only and must remain held until the explicit Production unfreeze conditions are satisfied.

## Decision

After Beagle completion, findings triage, and explicit owner Production unfreeze, configure repository-controlled Vercel function execution for `dub1` using `vercel.json`.

`dub1` is selected because it keeps server-side execution in the EU and materially closer to the Supabase `eu-west-1` data plane than the currently observed `iad1` execution region.

Automatic Git deployments remain disabled. Production promotion must continue through the governed exact-SHA release workflow rather than branch pushes or Preview promotion.

## Prerequisites before merge or Production use

All of the following must be true:

1. the active Beagle test is finished and its report is available;
2. findings are triaged and any Critical/High findings are closed or handled under the owner's explicit remediation authorization;
3. the Beagle evidence package is updated for the runtime actually assessed;
4. the owner explicitly sets `AUTHORIZE_PRODUCTION_UNFREEZE=YES`;
5. the PR head is rebased or reconciled with the final post-pentest `main` and all required CI/security checks pass on that exact head;
6. any other held release changes are inventoried so region movement is not accidentally combined with an unrelated unreviewed Production mutation.

## Expected benefits

- lower network distance between Vercel server functions and the Supabase Production data plane;
- lower exposure to transatlantic latency variance for server-side Supabase calls;
- a cleaner operational topology for EU-hosted application data;
- clearer regional intent encoded in version-controlled release configuration.

## Trade-offs and risks

- this changes the execution location of Vercel functions and therefore changes operational failure behavior;
- third-party calls whose infrastructure is closer to North America may see different latency characteristics;
- caches, connection establishment, cold-start behavior, and provider routing can differ after the region move;
- region affinity alone must not be represented as proof that the historical `/api/ready` 503 condition is fixed;
- a post-deployment regression could require immediate rollback to the previous region/configuration through the governed release path.

## Security, privacy, and tenancy impact

The decision does not change authentication, RBAC, tenant predicates, RLS, secrets, billing authority, or database schema. Keeping server execution in the EU reduces unnecessary geographic distance to the EU Production database but is not, by itself, a legal data-residency guarantee.

No secret values or customer data are introduced into repository configuration.

## Deployment and acceptance

After explicit unfreeze, merge and deploy only through the governed exact-SHA Production workflow. Acceptance requires retained evidence from the resulting canonical deployment showing:

1. the deployment is bound to the intended final Git SHA;
2. Vercel reports the intended EU function region;
3. `/api/health` passes;
4. authenticated `/api/ready` passes repeatedly over a bounded observation window, with latency recorded rather than a single-point success;
5. Production logs show no new `PGRST003` or readiness-timeout cluster attributable to the release;
6. Supabase rollback and PostgREST activity remain within the stable post-containment baseline;
7. critical authenticated flows and the exact-SHA runtime/security proof chain pass.

If these conditions do not pass, this ADR remains unaccepted for Production regardless of CI success.

## Rollback

Rollback is repository-controlled and must use the same governed release path:

1. revert the `regions: ["dub1"]` configuration to the last reviewed region configuration;
2. run required CI/security gates on the rollback SHA;
3. deploy that exact rollback SHA through the protected Production workflow;
4. verify canonical aliases, health/readiness, logs, and Supabase baseline after rollback;
5. retain the failed-deployment and rollback evidence for incident/release review.

Do not use an ad-hoc alias move or Preview promotion as a substitute for the governed rollback unless an independently authorized emergency procedure explicitly permits it.

## Alternatives considered

### Keep `iad1`

Rejected as the preferred post-freeze topology because it preserves the observed transatlantic Vercel-to-Supabase path and does not remove a known latency variable.

### Increase readiness timeouts only

Rejected as the primary change because it masks latency rather than reducing it. Timeout tuning may be reconsidered only from post-deployment measurements.

### Multi-region function execution

Deferred. It introduces additional state, routing, cache, and provider-consistency questions that are unnecessary for the current reliability objective.

## Evidence boundary

This ADR records a proposed architectural decision and its acceptance contract. It does not claim that Beagle assessed the future `dub1` runtime, that the readiness timeout root cause is fully proven, or that Enterprise Production acceptance is complete.
