# ADR: Re-run the enterprise scorecard after required check completion

- Status: Accepted
- Date: 2026-07-21
- Scope: GitHub Actions enterprise evidence orchestration

## Context

The Enterprise Readiness Scorecard starts on pull requests and pushes while the required CI, security and runtime workflows run independently. Its exact-SHA check collector waits for required workflows to become terminal. A completed failure is intentionally retained as `NOT_VERIFIED` and blocks repository-control evidence.

A workflow re-run updates the original workflow run to success, but the scorecard previously listened only to five runtime-proof workflows. A successful re-run of `Full Security Suite`, `CI`, `Enterprise Production Gate` or another required check therefore did not start a fresh scorecard evaluation. The original scorecard stayed failed even though the exact SHA later became green.

## Decision

The scorecard `workflow_run` trigger uses an explicit block-list containing:

1. every workflow required by `capture-github-checks-evidence.mjs`; and
2. the five runtime evidence producers already supported by the scorecard.

The scorecard job continues to run only when the triggering workflow concludes successfully. Concurrency remains scoped to the exact workflow-run SHA with `cancel-in-progress: true`, so simultaneous completion events converge on one latest evaluation rather than producing conflicting artifacts.

## Security properties

- no write permissions are added;
- the scorecard still checks out and assesses the exact triggering SHA;
- failed workflows cannot directly trigger a successful scorecard run;
- the scorecard does not accept a check merely because a completion event occurred;
- the existing GitHub API collector still verifies all required workflow conclusions and exact SHA binding;
- the scorecard does not trigger itself;
- runtime evidence source-run IDs remain allowlisted to their existing five producers.

## Consequences

A required check that is re-run successfully now causes a fresh scorecard evaluation. Early completion events may start scorecards that are cancelled by later events; exact-SHA concurrency makes this expected and deterministic. A genuinely failing required workflow continues to block evidence and the canonical percentage.

## Rollback

Revert the workflow trigger change and its contract test. This restores the previous behavior but also restores the stale-failure race after successful workflow re-runs.
