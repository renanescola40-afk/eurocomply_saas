# Legal Rules Runtime Rollback Plan

## Scope

Rollback of the 2026-07-30 legal-rules source refresh, deterministic runtime proof endpoint, coverage acceptance policy and related evidence automation.

No database schema or customer-data migration is introduced by this package.

## Rollback triggers

- qualified review identifies a material error in the mapped article, legal role, exception or application date;
- runtime evidence differs from deterministic test expectations;
- the endpoint exposes unintended data or creates material availability risk;
- release metadata binds the endpoint to the wrong SHA;
- CI discovers a regression in the canonical decision engine;
- the deployment cannot be restored to a known-good state.

## Immediate containment

1. Stop runtime artifact promotion and keep the release decision `NO_GO`.
2. Disable or roll back the affected deployment through the platform's normal immutable-deployment mechanism.
3. Preserve the failed artifact, workflow run ID, request ID, deployment URL and SHA as incident evidence.
4. Do not edit a previously issued PASS artifact.
5. Notify the engineering owner and qualified legal reviewer when legal-source interpretation is involved.

## Code rollback order

1. Revert `/api/public/legal-rules-validation` and the runtime evidence builder if the endpoint itself is unsafe.
2. Revert the scorer specialization only together with the endpoint/capture format to avoid accepting orphaned schemas.
3. Revert the legal-rules source mapping only after confirming the previous version is legally safer.
4. Revert tests, matrix, scorecard and documentation in the same rollback PR so evidence does not contradict code.
5. Retain the canonical evidence placeholder as `NOT_EXECUTED` until the rollback SHA is deployed and tested.

## Deployment target

The rollback operator must record:

- previous known-good deployment URL;
- previous known-good full commit SHA;
- rollback deployment URL;
- rollback deployment SHA;
- start and completion timestamps;
- operator and approver;
- incident or change reference.

These values are intentionally not hard-coded in this repository.

## Verification after rollback

- `npm ci --ignore-scripts`;
- focused legal-rules and decision-engine tests;
- typecheck, lint and build;
- security no-store, headers, logs and public-error gates;
- `/api/health` public smoke;
- protected readiness;
- exact-SHA runtime release metadata;
- deployment smoke;
- legal-rules runtime validation for the rollback SHA if the endpoint remains enabled;
- EU AI Act coverage regeneration;
- scorecard regeneration.

## Data and evidence handling

- No database rollback is expected.
- Runtime artifacts are immutable and append-only.
- Mark superseded evidence through a new closeout record; do not modify hashes or timestamps.
- Never copy a PASS artifact to a different SHA or deployment URL.

## Completion rule

Rollback is complete only when the rollback SHA has green required CI, a healthy deployment, protected readiness, exact-SHA release metadata and regenerated evidence. Until then, status remains `NO_GO`.
