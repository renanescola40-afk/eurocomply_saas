# ADR: Treat only orchestration-only skipped Production Gate runs as non-evaluations

- Date: 2026-08-14
- Status: Accepted
- Scope: Enterprise release evidence orchestration

## Context

The Enterprise Readiness Scorecard stabilizer waits for material exact-SHA evidence producers, ensures the Enterprise Production Gate covers the latest producer state, and only then dispatches the terminal scorecard.

`Enterprise Production Gate` also listens to retained-proof `workflow_run` completions. When one of those upstream proof workflows fails, the gate workflow is still created but its jobs are intentionally skipped. GitHub records that orchestration-only run as `event=workflow_run`, `status=completed`, `conclusion=skipped`.

The retained runtime-proof fan-in contract already defines that exact shape as a no-op rather than a release evaluation. The stabilizer previously treated the newest completed non-success/failure gate as an immediate error. That allowed an orchestration-only skipped record to race with, and mask, a real exact-SHA Production Gate evaluation.

At the same time, broadening the exception to every `skipped`, `cancelled`, `timed_out`, or `action_required` gate would weaken fail-closed release semantics. Those outcomes from a real gate execution are authoritative operational failures and must not be hidden behind an older success/failure evaluation.

## Decision

The scorecard stabilizer uses the same precise no-op definition as the retained runtime-proof fan-in:

- workflow name is `Enterprise Production Gate`;
- event is `workflow_run`;
- status is `completed`;
- conclusion is `skipped`.

Only that exact shape is ignored while selecting a Production Gate evaluation.

A completed real gate with `cancelled`, `timed_out`, `action_required`, or any other non-success/failure conclusion remains authoritative and terminates stabilization as a failure.

If the settlement window contains only orchestration-only skipped gate records and the outer stabilizer did not already request a refresh, the stabilizer may dispatch exactly one bounded manual Production Gate refresh after two consecutive skipped-only polls. It re-verifies that `main` is still the exact target SHA before dispatching. If a refresh was already dispatched, no second fallback is available.

The existing bounded settlement timeout remains authoritative when no real `success`/`failure` evaluation appears.

## Safety boundary

This decision does not:

- convert `skipped`, `cancelled`, `timed_out`, or `action_required` into PASS;
- change Production Gate validation criteria;
- mutate production systems, providers, secrets, repository environments, or branch protection;
- relax exact-SHA or current-main requirements;
- permit unbounded workflow dispatch loops;
- change downstream Go/No-Go semantics.

Only the known orchestration-only `workflow_run/skipped` record is excluded from release-evaluation selection.

## Consequences

The scorecard fan-in becomes resilient to the GitHub Actions no-op record created by failed retained-proof producers without hiding real Production Gate failures.

A genuine terminal operational failure remains visible immediately. A skipped-only orchestration race can recover with at most one exact-main refresh and otherwise fails closed at the existing bounded timeout.
