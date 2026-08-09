# ADR — Supabase migration subject SHA and evidence-only lineage

Date: 2026-08-09

Status: Accepted

## Context

The migration reconciliation control plane originally required the reviewed `release_sha` to equal the current `main` SHA at every downstream gate. The same control plane also required reviewed decisions, staging results and production change requests to be committed to the repository.

Those requirements form an impossible fixed point: committing the evidence changes `main`, which invalidates the SHA stored in the evidence; updating the evidence changes `main` again.

A second circular dependency existed for `PENDING_DEPLOYMENT`: classification acceptance required completed staging evidence, while staging required an accepted classification/execution plan first.

The staging and bounded-production workflows also had stale schema contracts: the staging compiler expected fields not emitted by the reconciliation producer, and the bounded compiler expected `releaseSha` while the staging attestation emitted only `targetSha`.

## Decision

### 1. Separate subject and evidence commits

The control plane uses two identities:

- **subject release SHA**: immutable commit containing the migration files and code that were inventoried and reviewed;
- **evidence commit SHA**: current `main` descendant containing only canonical evidence documents.

The subject must be an ancestor of the evidence commit. Every gate validates the exact path delta between them.

### 2. Canonical evidence paths

Only these files may advance `main` while preserving the same subject SHA:

1. `docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json`
2. `docs/security/evidence/accepted/supabase-staging-rehearsal-result.json`
3. `docs/security/evidence/accepted/supabase-bounded-production-change-request.json`

Each stage allows only the subset it needs. Changes to migrations, application code, workflows or unrelated documentation invalidate the lineage.

### 3. Classification precedes staging

`PENDING_DEPLOYMENT` classification requires schema evidence, a unique deployment order and rollback plan. It does not claim that staging has already happened.

Successful classification produces `RECONCILIATION_ACCEPTED_FOR_STAGING`, never production authorization.

### 4. Staging consumes the modern execution plan

The protected staging workflow consumes `Supabase Migration Execution Plan`, generates a deterministic staging plan, and intentionally fails until a real reviewed staging result is committed at the canonical path.

The passing staging attestation seals the exact subject SHA, plan digest, result digest, staged migration set digest and exact staged filename/SHA-256 set.

### 5. Production requests may contain only staged migrations

The bounded production compiler verifies that every requested migration matches the staged filename and SHA-256 and that the entire staged set is represented. It also requires backup/restore evidence, bounded maintenance window, independent approval evidence, rollback controls and post-change checks.

The compiler still performs no SQL and keeps automatic execution disabled.

## Consequences

### Positive

- removes impossible SHA self-reference without weakening exact-SHA evidence;
- prevents code or migration changes from hiding inside evidence promotion;
- removes the staging/classification circular dependency;
- binds production authorization to the exact staged migration set;
- preserves human review and independent approval requirements;
- keeps production writes fail-closed and non-automatic.

### Trade-offs

- one subject SHA can have multiple later evidence-only commits;
- operators must understand the distinction between subject SHA and evidence commit SHA;
- staging and production evidence must use canonical repository paths;
- a non-evidence change requires a new subject SHA and a fresh exact-SHA evidence chain.

## Rejected alternatives

### Require current `main` to equal the reviewed SHA forever

Rejected because committing the required evidence makes the condition impossible to satisfy.

### Store human evidence outside Git only

Rejected as the sole mechanism because the control plane benefits from reviewed, versioned, path-restricted evidence documents. External runtime artifacts remain referenced by immutable digests/URLs where appropriate.

### Auto-classify or auto-approve migrations

Rejected. Technical candidate classifications are review aids only. Human item review and independent approval remain mandatory.

### Automatically execute staging or production migrations from the compiler

Rejected. Planning, attestation and authorization remain separate from execution.

## Rollback

If this lineage model causes an unexpected control-plane regression, revert the workflow, script, template and runbook changes from this ADR as one reviewed change before any migration execution is attempted. Do not revert or rewrite database history as part of the code rollback.

Any subject SHA whose evidence was produced with the reverted model must be treated as invalid for promotion. Regenerate the migration inventory, live schema evidence, review dossiers and decision template under the restored control-plane version before continuing.

If staging or production authorization artifacts were already generated under this model, mark those artifacts superseded and do not reuse them after rollback. Production writes remain disabled by default, so reverting this ADR must never itself execute SQL, repair migration history or authorize an unrestricted database push.
