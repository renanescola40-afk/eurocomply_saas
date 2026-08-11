# ADR: Aggregate exact-SHA scorecard evidence before terminal enforcement

- Status: Accepted
- Date: 2026-08-11
- Scope: Enterprise Readiness Scorecard orchestration

## Context

The Enterprise Readiness Scorecard is an evidence aggregator. It must preserve `Open`, `Blocked`, `FAIL` and `NOT_VERIFIED` states long enough to collect independent exact-SHA runtime evidence and publish the canonical scorecard artifact.

On main SHA `1abc316c4eded523d811b52936763bf6368d7bc2`, scorecard run `31527271496` stopped at `Build exact-SHA repository control evidence`. The repository-control builder correctly generated exact-SHA documents whose status was `Open`, then exited with status 1 because not every generated control was `Complete`. GitHub Actions therefore skipped all later runtime retrieval steps, scorecard generation and the canonical `enterprise-readiness-scorecard-<sha>` artifact.

That behavior conflated two different boundaries:

1. whether an evidence builder produced structurally valid, exact-SHA, non-sensitive evidence; and
2. whether that evidence is sufficient to award PASS/GO.

The first boundary belongs to aggregation. The second belongs to the scorecard and release gates.

The scorecard also depends on terminal required checks. Its workflow-run trigger must therefore include every workflow consumed by the exact-SHA GitHub-check collector, plus the supported runtime evidence producers, so a later successful completion can cause a fresh exact-SHA evaluation.

## Decision

The scorecard uses a dedicated repository-control aggregation wrapper.

The wrapper executes the existing strict repository-control builder unchanged. A builder exit code of 1 is accepted only when every expected output:

- exists and parses as JSON;
- is bound to the canonical repository;
- has `targetSha` and `observedSha` equal to the assessed SHA;
- is either `Complete/passed` or `Open/not_verified`;
- declares `evidenceIntegrity.exactShaBound: true`;
- does not contain sensitive values.

Missing, malformed, stale-SHA, sensitive, provenance-invalid, unexpected-status evidence, or any unexpected builder exit remains fatal. The wrapper never rewrites `Open` to `Complete` and never awards PASS.

After repository-control evidence is safely retained, the scorecard continues collecting independent runtime producers, generates the canonical scorecard, writes persistent execution state, and uploads `enterprise-readiness-scorecard-<sha>`.

For pull requests, artifact generation is the terminal behavior: a PR SHA is not expected to possess protected `main` runtime proof.

For push, manual main evaluation and successful workflow-run re-evaluation, the workflow applies a final terminal enforcement after artifact upload and fails unless `releaseDecision == GO`.

The workflow-run trigger is the explicit 20-item union of:

- the 13 workflows consumed by `capture-github-checks-evidence.mjs`; and
- the 7 runtime evidence producers supported by the scorecard.

Only successful `workflow_run` completions start a new evaluation. The scorecard never triggers itself.

## Security properties

- Repository permissions remain `actions: read` and `contents: read`.
- No production database, provider, secret, branch protection or runtime configuration is changed.
- `Open`, `Blocked`, `FAIL` and `NOT_VERIFIED` evidence receives no PASS credit.
- Exact-SHA, repository provenance and sensitive-value boundaries remain fail-closed.
- The original strict builder remains strict for direct callers.
- The aggregation exception is narrowly scoped to builder exit 1 with fully validated `Open/Complete` outputs.
- The canonical artifact is available even when main remains `NO_GO`, so downstream Enterprise 100 closure can evaluate real evidence instead of interpreting early pipeline abortion as missing evidence.
- Pull-request validation cannot be made red merely because protected main runtime evidence cannot exist for the PR SHA.

## Consequences

A real incomplete control still keeps main `NO_GO` and red at the terminal enforcement step. The difference is that later independent evidence is no longer lost, and the canonical scorecard artifact records the actual state of the assessed SHA.

Successful reruns of required checks or runtime producers cause a fresh exact-SHA scorecard evaluation, allowing the scorecard to converge after evidence improves.

## Rollback

Restore direct execution of `build-repository-control-evidence.mjs`, remove the terminal enforcement step, and restore the previous workflow-run trigger list. This also restores the early-abort behavior and incomplete canonical evidence fan-in.
