# Enterprise Recovery Control Plane

- Status: Accepted
- Date: 2026-07-20
- Updated: 2026-08-13

## Context

Recovery evidence is fragmented across rollback, backup, restore, RLS, RPO and RTO plans. The enterprise scorecard cannot promote recovery controls from repository claims alone, and an automatic backup/restore workflow must never manufacture evidence that a live rollback occurred.

The repository has two materially different recovery activities:

1. a safe, repeatable backup/restore exercise that may run automatically on exact `main`; and
2. a controlled production rollback, which mutates provider state and therefore requires a protected environment, explicit confirmation and real provider credentials.

These activities must not share synthetic evidence or collapse into one boolean-driven producer.

## Decision

### Automatic backup/restore drill

`Enterprise Recovery Drill` is a non-destructive exact-SHA producer for backup/restore evidence only. It:

- runs from exact current `main`;
- reuses the protected Supabase pooler source connection already owned by the read-only production migration environment;
- provisions a disposable loopback-only Supabase/PostgreSQL restore target inside the GitHub runner;
- uses the canonical supported logical backup implementation in `scripts/recovery/run-backup-restore-exercise.mjs`;
- validates restored data integrity, RLS/policy metadata, RPO and RTO with `scripts/recovery/check-recovery-evidence.mjs`;
- removes the disposable target after the proof;
- emits only redacted `backup-restore-tested.json` and preflight evidence.

It does **not** accept rollback targets, does not claim rollback execution, and does not emit `rollback-source.json`.

### Controlled production rollback

`Recovery Resilience Proof` remains the canonical protected workflow for a real production rollback. Rollback/full modes require the explicit `EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK` confirmation, protected provider credentials and the production-recovery environment. Only the real rollback exercise may produce canonical `docs/security/evidence/runtime/rollback-validation.json` evidence.

### Evidence integrity

The legacy `scripts/enterprise/build-recovery-evidence.mjs` synthetic producer is retired fail-closed. Callers must use the canonical backup/restore and live rollback scripts instead.

The Enterprise Readiness Scorecard and Enterprise 100 closure must continue to consume only successful exact-SHA canonical artifacts. Missing, stale, ambiguous, malformed or noncanonical rollback evidence remains `NOT_VERIFIED`/NO-GO.

## Risks and trade-offs

The automatic backup/restore proof still depends on a protected read-only Supabase source credential and runner capacity. The real rollback proof still depends on protected Vercel credentials, an independently identified last-known-good deployment and human confirmation.

This separation deliberately means that a successful automatic restore drill cannot close a rollback control. That is a feature: repository automation cannot prove a production rollback that did not happen.

The disposable restore target validates recoverability without maintaining a long-lived secondary recovery database credential. It is isolated to the runner and destroyed after the exercise.

## Rollback

If this architecture must be reverted, restore the prior workflow/test/docs together, but do not re-enable synthetic rollback evidence. Recovery scorecard controls must fall back to `NOT_VERIFIED` rather than credit a noncanonical or caller-asserted rollback result.
