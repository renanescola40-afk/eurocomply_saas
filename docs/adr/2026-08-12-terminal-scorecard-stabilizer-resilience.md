# ADR: Terminal scorecard stabilizer resilience under workflow storms

- Date: 2026-08-12
- Status: Accepted
- Scope: Enterprise Readiness Scorecard terminal orchestration

## Context

On exact `main` SHA `c5a9b4e8be6f29b4e7e96e4cb49080794ee8118a`, the repository produced a very large workflow fan-out after merge. GitHub reported 219 workflow runs bound to that SHA during investigation.

For `Enterprise Readiness Scorecard` on the same SHA, the observed state contained:

- 0 successful runs;
- 16 cancelled runs;
- 7 skipped runs;
- no retained `enterprise-readiness-scorecard-<sha>` artifact at the time of inspection.

The latest `Enterprise Readiness Scorecard Stabilizer` run for the SHA also failed in its `Stabilize terminal exact-SHA scorecard` step before producing a terminal scorecard dispatch. The connector did not expose a usable step log body, so the exact GitHub API error text could not be retained. The failure occurred during a high-churn period in which many producer completions independently triggered stabilizer runs.

## Problem

The stabilizer was intended to coalesce producer completion events with `concurrency.cancel-in-progress`, but every triggered run performed checkout, Node setup and GitHub API inventory work immediately. Under a producer storm, runs cancelled by later events could still consume runner and API capacity before cancellation.

A transient GitHub API failure in the surviving stabilizer could therefore leave an exact SHA without a terminal scorecard artifact even though repository and runtime producers had already completed.

## Decision

### 1. Debounce before any checkout or API access

Producer-triggered stabilizer runs sleep for 90 seconds before checkout or script execution. Because the concurrency group is exact-SHA scoped with `cancel-in-progress: true`, newer producer completions cancel older debouncing runs before they consume GitHub API inventory calls.

Manual recovery runs skip this debounce.

### 2. Retry transient GitHub API pressure

The stabilizer API client retries bounded transient failures:

- HTTP 403;
- HTTP 429;
- HTTP 5xx;
- network-level fetch failures.

Retries use bounded exponential backoff and honor `Retry-After` / `X-RateLimit-Reset` hints up to a 30-second cap. After five attempts the stabilizer still fails closed.

### 3. Increase bounded exact-SHA inventory headroom

The exact-SHA inventory remains bounded, but the maximum increases from 3 to 5 pages of 100 runs. An inventory larger than the inspected bound still fails closed instead of assuming missing evidence.

### 4. Add an explicit manual recovery entry point

`workflow_dispatch` accepts an optional exact `target_sha`. The workflow still validates checkout identity and the script still verifies that `main` has not advanced before dispatching the scorecard.

### 5. Preserve security and evidence semantics

This change does not:

- award PASS or GO;
- alter score calculation;
- fabricate runtime evidence;
- mutate production;
- change providers, secrets or environments;
- bypass exact-SHA validation;
- weaken branch protection or release gates.

## Consequences

Expected benefits:

- fewer duplicate API calls during merge fan-out;
- a substantially lower chance that a transient GitHub API pressure event prevents terminal scorecard generation;
- an explicit recovery path when a transient infrastructure failure still occurs;
- better error categorization through the stable `stabilizer-error` workflow output.

Trade-offs:

- the terminal scorecard is intentionally delayed by at least 90 seconds after the final observed material producer completion;
- manual recovery remains available but is not treated as evidence by itself;
- GitHub infrastructure failures can still block closure after bounded retries, which is intentional fail-closed behavior.
