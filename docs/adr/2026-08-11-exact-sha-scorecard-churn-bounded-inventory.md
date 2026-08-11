# ADR: Exact-SHA Scorecard Churn and Bounded Evidence Inventory

Date: 2026-08-11
Status: Accepted

## Context

After the Enterprise 100 exact-SHA provenance hardening merged, main SHA `2224a39ab7115c08636e5436b07204059bdccd69` generated more than 20 completed `Enterprise Readiness Scorecard` workflow runs.

The retained-artifact collector intentionally failed closed because it queried only the 20 most recent completed runs. Its canonical artifact reported:

- `status: InfrastructureBlocked`
- `errorCode: RECENT_RUN_WINDOW_EXHAUSTED`
- `totalCompletedRuns: 25`
- `inspectedRunCount: 20`

The resulting Enterprise 100 result contained 0/11 accepted controls, but that value was not a product-control result. Artifact inventory had stopped before evidence hydration.

The same SHA subsequently reached 27 Scorecard runs while the producer graph was still settling, confirming that 20 is not a safe upper bound for a busy exact-SHA fan-in.

## Decision

### 1. Use GitHub's maximum single-page workflow-run inventory

The exact-SHA artifact collector now requests `per_page=100` for each allowlisted producer workflow.

This keeps collection:

- workflow scoped;
- exact-SHA filtered server-side;
- bounded to one workflow-runs API request per producer before per-run artifact inspection;
- fail-closed when the returned inventory is still incomplete.

The collector does not switch to unbounded repository-wide pagination.

### 2. Preserve an explicit ambiguity boundary

If an allowlisted producer reports more completed exact-SHA runs than the returned 100-run window and no authorized artifact is found, collection remains `InfrastructureBlocked` with `RECENT_RUN_WINDOW_EXHAUSTED`.

An infrastructure inventory limit must never be reinterpreted as evidence absence or PASS.

### 3. Stabilize against the complete material producer set

The Enterprise Readiness Scorecard Stabilizer now observes the same 20 material producer workflows used by the readiness fan-in, rather than only the seven runtime-specific producers.

The stabilizer:

- remains exact-SHA bound;
- waits for active producers to settle;
- requires a bounded quiet window;
- verifies `main` still points to the assessed SHA;
- does not dispatch when a current successful or active Scorecard already covers the latest producer completion;
- dispatches only the fixed existing Scorecard workflow;
- never awards PASS and never mutates production.

This ensures a terminal Scorecard can be produced after the entire material producer set settles, even when an earlier Scorecard was cancelled or superseded during churn.

## Alternatives rejected

### Treat 0/11 as authoritative

Rejected. The collection manifest explicitly classified the run as infrastructure-blocked before evidence hydration.

### Increase the window without a bound

Rejected. Unbounded Actions inventory can exhaust GitHub API quota and recreate the earlier evidence-transport failure mode.

### Ignore older runs whenever the newest 20 have no artifact

Rejected. That would turn an incomplete inventory into a false `evidence_missing` result.

### Manufacture a terminal scorecard artifact

Rejected. Only the existing evidence-backed Scorecard evaluator may produce readiness results.

## Consequences

- The observed 25–27-run exact-SHA churn no longer blocks evidence discovery solely because it exceeds 20 runs.
- A pathological exact-SHA history above the bounded 100-run inventory still fails closed.
- Terminal stabilization now covers required checks and runtime evidence producers consistently.
- This ADR changes evidence transport/orchestration only. It does not convert missing provider, runtime, legal, external-security, recovery, billing, or governance evidence into PASS.
