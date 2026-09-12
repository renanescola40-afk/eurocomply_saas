# ADR-0129: Align Vercel function execution with the EU Production data plane

## Status

Proposed for governed Production convergence. The active Beagle assessment does **not** impose a global merge/deploy freeze. This ADR permits normal branch, PR, CI and governed release work when operationally necessary, while preserving the evidence boundary between the version Beagle assessed and any later post-scan release.

This ADR does not authorize dangerous manual Production mutation, Beagle cancellation/pause/retargeting, authenticated Beagle testing, destructive testing, DNS changes, or manual Supabase Production changes.

## Context

RISCK COMPLY Production currently has a geographic split in its server-side request path:

- Supabase Production `tganhbbhfxcpblmgqprg` is hosted in `eu-west-1`;
- the canonical Vercel Production deployment observed during the active Beagle assessment executes server functions in `iad1`;
- authenticated `/api/ready` observations on that deployment have returned bounded Supabase readiness timeouts;
- the readiness relations inspected in Production are small, and contemporaneous database samples showed normal commit progress without the historical rollback storm.

These observations make cross-region network distance a material reliability factor worth removing. They do not prove that region distance is the sole root cause of the observed readiness timeouts.

The Beagle assessment remains external automated unauthenticated VAPT evidence. It is bound to the Production version actually assessed and must not be represented as coverage of a later deployment automatically.

## Decision

Configure repository-controlled Vercel function execution for `dub1` using `vercel.json`.

`dub1` is selected because it keeps server-side execution in the EU and materially closer to the Supabase `eu-west-1` data plane than the currently observed `iad1` execution region.

Automatic Git deployments remain disabled. Production promotion must continue through the governed exact-SHA release workflow rather than branch pushes or Preview promotion.

## Merge / Production-use conditions during an active Beagle assessment

Merge and deploy may proceed when necessary through normal repository/release governance. Before any Production promotion while the current Beagle assessment remains unfinished:

1. preserve the current Beagle status, screenshots or other available test evidence;
2. preserve the tested target/deployment/SHA binding and relevant timestamps;
3. do not delete or overwrite Beagle reports, logs or evidence;
4. record that existing Beagle evidence belongs to the pre-change Production version;
5. classify the resulting deployment as a post-scan version and do not claim it inherited Beagle coverage without revalidation;
6. ensure the exact PR head is reconciled with protected `main` and required CI/security checks pass;
7. inventory other release changes so region movement is not accidentally combined with unrelated unreviewed Production mutation.

Current retained Beagle binding at the time of this ADR update:

```text
BEAGLE_TARGET=https://www.risckcomply.com
BEAGLE_OBSERVED_PRODUCTION_DEPLOYMENT=dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9
BEAGLE_OBSERVED_PRODUCTION_SHA=13b19410caa20045b19d98d58df406c43433af5a
BEAGLE_OBSERVED_FUNCTION_REGION=iad1
EXTERNAL_AUTOMATED_UNAUTHENTICATED_VAPT=IN_PROGRESS
INDEPENDENT_HUMAN_PENTEST=NOT_PASS
```

If a new Production deployment is promoted, those markers remain historical evidence for the version Beagle observed; they are not rewritten to the new SHA.

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
- a post-deployment regression could require immediate rollback through the governed release path;
- if deployed before Beagle completion, the new runtime is outside the scope of the already-running Beagle evidence unless separately revalidated.

## Security, privacy, tenancy and pentest impact

The decision does not change authentication, RBAC, tenant predicates, RLS, secrets, billing authority, or database schema. Keeping server execution in the EU reduces unnecessary geographic distance to the EU Production database but is not, by itself, a legal data-residency guarantee.

No secret values or customer data are introduced into repository configuration.

The change must not cancel, pause, retarget or otherwise directly manipulate the current Beagle assessment. `INDEPENDENT_HUMAN_PENTEST=PASS` must not be inferred from Beagle or from this regional change.

## Deployment and acceptance

Deploy only through the governed exact-SHA Production workflow. Acceptance of the region change requires retained evidence from the resulting canonical deployment showing:

1. the deployment is bound to the intended Git SHA;
2. Vercel reports the intended EU function region;
3. `/api/health` passes;
4. authenticated `/api/ready` passes repeatedly over a bounded observation window, with latency recorded rather than a single-point success;
5. Production logs show no new `PGRST003` or readiness-timeout cluster attributable to the release;
6. Supabase rollback and PostgREST activity remain within the stable post-containment baseline;
7. critical authenticated flows and the exact-SHA runtime/security proof chain pass;
8. Beagle evidence remains preserved against the version it actually assessed.

If these conditions do not pass, this ADR remains unaccepted for Production regardless of CI success.

## Rollback

Rollback is repository-controlled and must use the same governed release path:

1. revert the `regions: ["dub1"]` configuration to the last reviewed region configuration;
2. run required CI/security gates on the rollback SHA;
3. deploy that exact rollback SHA through the protected Production workflow;
4. verify canonical aliases, health/readiness, logs and Supabase baseline after rollback;
5. retain the failed-deployment and rollback evidence for incident/release review.

Do not use an ad-hoc alias move or Preview promotion as a substitute for the governed rollback unless an independently authorized emergency procedure explicitly permits it.

## Alternatives considered

### Keep `iad1`

Rejected as the preferred topology because it preserves the observed transatlantic Vercel-to-Supabase path and does not remove a known latency variable.

### Increase readiness timeouts only

Rejected as the primary change because it masks latency rather than reducing it. Timeout tuning may be reconsidered only from post-deployment measurements.

### Multi-region function execution

Deferred. It introduces additional state, routing, cache and provider-consistency questions that are unnecessary for the current reliability objective.

## Evidence boundary

This ADR records an architectural decision and its acceptance contract. It does not claim that Beagle assessed the future `dub1` runtime, that the readiness timeout root cause is fully proven, that the Beagle automated assessment is an independent human pentest, or that Enterprise Production acceptance is complete.
