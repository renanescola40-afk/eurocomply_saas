# Decision: fail fast when migration evidence children wait on protected environments

- Date: 2026-08-15
- Status: Accepted
- Owners: Release / Platform / Security
- Scope: Supabase migration evidence orchestration

## Context

`Supabase Migration Evidence Bootstrap` coordinates a read-only, exact-SHA evidence chain. Some child workflows intentionally use protected GitHub Environments that require a human reviewer before secrets-bearing capture can start.

GitHub reports those protected child runs as `waiting`. The bootstrap previously treated `waiting` like `queued` or `in_progress` and could poll for up to 90 minutes. That behavior did not bypass the human gate, but it kept the parent bootstrap check non-terminal long after the real state was already known. Enterprise readiness scorecard capture waits for exact-SHA checks to settle, so a legitimate human approval gate could unnecessarily delay or time out terminal release evidence.

Observed on `main@6502f963aa5385fb5dd0e6b869161134edb6aa18`:

- bootstrap run `31910230959` dispatched live-schema child `31910467637`;
- the child contract passed;
- the protected capture job remained `waiting` on environment `supabase-production-schema-evidence`;
- the environment correctly required an independent reviewer and did not allow admin bypass;
- the bootstrap remained non-terminal because `waiting` was included in the normal long-poll state set.

## Decision

The bootstrap distinguishes protected manual wait from ordinary scheduling/runtime states.

- `queued`, `in_progress`, `pending`, and `requested` continue to use the normal bounded polling loop.
- `waiting` receives three short polls of grace to avoid reacting to a transient state transition.
- if `waiting` persists, the bootstrap records `BLOCKED_AWAITING_ENVIRONMENT_REVIEW`, records the child run ID, returns non-zero, and publishes the partial provenance artifact via `if: always()`.
- the bootstrap never approves, rejects, cancels, or otherwise mutates the protected child's environment decision.

The result is intentionally fail-closed. A blocked bootstrap is not a successful evidence chain and cannot grant migration or release credit.

## Late approval semantics

A protected child may later be approved after the parent bootstrap has already terminated. That late child success does not resume, repair, or retroactively complete the failed bootstrap.

Operators must:

1. treat the late result only as evidence for that individual child run;
2. confirm whether the bootstrap subject SHA is still exact current `main`;
3. if `main` moved, start a new bootstrap on the new exact SHA;
4. if `main` did not move, rerun the bootstrap for the same exact SHA after the protected gate has been cleared;
5. require a fresh parent chain to reach `HUMAN_MIGRATION_REVIEW_READY` before granting evidence-chain credit.

Combining artifacts from the failed parent with a late child result to synthesize completion is prohibited.

## Security and authorization boundary

This decision does not change provider or database authority.

The bootstrap retains:

- `productionWriteAuthorized=false`;
- `productionWritePerformed=false`;
- `stagingDispatched=false`;
- `boundedProductionChangeDispatched=false`.

It receives no Supabase database credentials and performs no SQL, `supabase db push`, migration ledger repair, staging rehearsal, or production promotion.

GitHub Environment reviewers remain the only authority for the protected child approval itself.

## Operational consequences

Benefits:

- terminal readiness checks are not held open for the entire child timeout when a human gate is already known;
- blocked provenance is explicit and machine-readable;
- operators can distinguish infrastructure scheduling from human approval dependency;
- late approvals cannot silently contaminate an already-failed parent chain.

Tradeoff:

- approving a protected child after the parent has failed requires a fresh bootstrap run to rebuild one coherent exact-SHA provenance chain.

This extra rerun is intentional. It is preferred over stitching evidence from temporally separate parent/child states.

## Rollback

If the fail-fast policy must be reverted, revert the workflow, tests, runbook, and this decision record together. Restoring long polling for `waiting` requires explicit release-owner acceptance that protected review latency can keep terminal scorecard checks non-terminal for the child timeout.

Rollback must not weaken GitHub Environment approval requirements or convert `waiting` into success.

## Verification

Regression coverage must prove that:

- `waiting` is no longer part of the ordinary long-poll status set;
- the bounded grace window is enforced;
- blocked state and child run ID are retained;
- the bootstrap exits non-zero;
- no production-write authority is introduced;
- the partial provenance bundle is still uploaded.
