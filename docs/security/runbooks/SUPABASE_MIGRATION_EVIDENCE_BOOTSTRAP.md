# Supabase migration evidence bootstrap

## Purpose

Automatically collect the exact-SHA, read-only migration evidence required before human migration classification, without granting staging or production authority.

The workflow coordinates existing protected workflows. It does not duplicate their database logic and it does not receive Supabase credentials directly.

## Trigger model

`Supabase Migration Evidence Bootstrap` runs after a non-evidence push to `main` and may also be started manually for the current `main` SHA.

The three canonical evidence-only paths are ignored by the push trigger:

1. `docs/security/evidence/runtime/supabase-migration-reconciliation-decisions.json`
2. `docs/security/evidence/accepted/supabase-staging-rehearsal-result.json`
3. `docs/security/evidence/accepted/supabase-bounded-production-change-request.json`

This preserves the immutable subject SHA while reviewed evidence advances in later commits.

Pull-request contract validation is intentionally outside the operational concurrency lock. Only the `bootstrap` job is serialized under `supabase-migration-evidence-bootstrap-main`, so an in-flight or stuck operational run cannot prevent a corrective PR from running its contract checks. Push and manual operational bootstraps remain serialized.

## Orchestrated stages

The workflow dispatches, waits for, records and verifies these existing workflows in order:

1. `Supabase Migration Drift Audit`
2. `Supabase Production Migration Dry Run`
3. `Supabase Live Schema Evidence`
4. `Supabase Migration Review Dossiers`
5. `Supabase Migration Reconciliation Decision Gate` to obtain the exact-SHA decision template

The dry-run confirmation is fixed to `DRY_RUN_ONLY`.

The bootstrap accepts a fail-closed drift/dry-run conclusion only when the expected immutable artifact still exists and contains the reconciliation inventory. This is intentional: unresolved migration drift can block deployability while still producing the evidence required for human reconciliation.

Live schema evidence and review dossier generation must complete successfully.

The decision gate may remain blocked when the canonical reviewed decision file is absent or stale; the bootstrap requires the exact-SHA `decision-template.json` artifact, not a synthetic approval.

## Child-run resolution contract

Every workflow dispatch is resolved back to exactly one numeric GitHub Actions run ID for the immutable subject SHA.

The dispatch helper treats stdout as a machine-readable return channel: output from `gh workflow run` is discarded and only the resolved numeric run ID is emitted. Callers validate the run ID again before polling, artifact lookup or download.

GitHub API errors, malformed run IDs and unexpected workflow states fail immediately instead of being treated as transient polling states. This prevents a malformed dispatch result from entering a long polling loop while appearing to be a running evidence chain.

`queued`, `in_progress`, `pending` and `requested` remain normal transient states. A child that reports `waiting` is different: for this evidence chain it means the protected child is waiting for a GitHub Environment reviewer or equivalent manual protection gate. The bootstrap gives that state three short polls of grace and then fails closed as `BLOCKED_AWAITING_ENVIRONMENT_REVIEW` instead of holding the parent check open for the full child timeout.

Artifact lookup allows a short bounded retry window because the Actions artifact index can become visible shortly after a child run reaches `completed`. The retry does not weaken evidence requirements: the exact expected artifact name and numeric artifact ID are still mandatory, otherwise the bootstrap fails closed.

## Protected-environment wait and late approval

`BLOCKED_AWAITING_ENVIRONMENT_REVIEW` is a terminal bootstrap state, not a successful evidence-chain state and not an approval to continue migration execution.

When the bootstrap reaches this state:

1. the bootstrap records the protected child run ID in `bootstrap-state.json` as `blockedRunId`;
2. the bootstrap exits non-zero and uploads its partial, non-authorizing provenance bundle using `if: always()`;
3. the protected child remains governed by its own GitHub Environment and may still be approved or rejected by an authorized reviewer;
4. a later success of that child **does not resume or retroactively complete** the failed bootstrap;
5. operators must not combine the old bootstrap state with the late child result and call the evidence chain complete.

### Recovery after approval

If the protected child is approved after the bootstrap has already failed:

1. allow the protected child to finish normally unless the operator intentionally decides to cancel it through GitHub Actions;
2. inspect its own artifact and conclusion only as child-run evidence; do not reinterpret the old bootstrap as complete;
3. confirm the repository subject is still the exact current `main` SHA used by the original bootstrap;
4. if `main` has moved, discard the old chain for release-credit purposes and start a fresh bootstrap on the new exact `main` SHA;
5. if `main` has not moved, rerun `Supabase Migration Evidence Bootstrap` for that same exact SHA so every stage is recollected and rebound through one parent provenance chain;
6. accept `HUMAN_MIGRATION_REVIEW_READY` only from the fresh bootstrap run after all required child artifacts validate end-to-end.

A late child success is therefore useful evidence, but it is never a substitute for a fresh successful bootstrap after the manual gate has been cleared.

### Rollback / operator escape hatch

The fail-fast policy does not change or revoke the protected child. If the approval should no longer proceed, an authorized operator may reject the environment deployment or cancel the child run in GitHub Actions. No repository workflow should auto-approve, auto-reject, or auto-cancel a protected child on behalf of the reviewer.

If this fail-fast behavior itself must be rolled back, revert the workflow/runbook/decision-record change together. Do not restore a long `waiting` poll unless the release owner explicitly accepts the resulting terminal-scorecard delay as an operational tradeoff.

## Provenance bundle

The bootstrap artifact is named:

`supabase-migration-evidence-bootstrap-<subject-sha>`

It contains:

- `bootstrap-state.json` with child workflow run IDs, conclusions and artifact names;
- when blocked on a protected environment, `bootstrap-state.json` also records `status=BLOCKED_AWAITING_ENVIRONMENT_REVIEW` and `blockedRunId`;
- `migration-reconciliation-inventory.json` when the chain reached and retained that stage;
- `migration-object-evidence.json` when available;
- `migration-review-dossiers.json` when available;
- `decision-template.json` when available;
- `SHA256SUMS` over retained review inputs when the full chain reaches the checksum stage.

A completed bundle reports `HUMAN_MIGRATION_REVIEW_READY`.

That status means only that a human reviewer has the evidence necessary to classify migrations. It is not staging approval, production approval or Enterprise GO.

## Permission boundary

The workflow-level token has `contents: read` only.

Only the bootstrap job receives `actions: write`, solely so it can dispatch and inspect the existing evidence workflows.

The bootstrap itself:

- does not reference Supabase secrets;
- does not run `psql`;
- does not run `supabase db push`;
- does not modify migration history;
- does not dispatch `Supabase Staging Rehearsal`;
- does not dispatch `Supabase Bounded Production Change`;
- does not authorize a production write.

Database access remains isolated inside the already protected child workflows and their environments.

## Failure handling

The process is fail-closed. The bootstrap stops when:

- the assessed SHA is no longer exact current `main`;
- a child workflow cannot be resolved to the same SHA;
- a dispatch or Actions API request fails;
- a child run ID is missing or non-numeric;
- a child run reports an unexpected state;
- a child remains `waiting` for protected environment review after the bounded grace window;
- an expected immutable artifact is still missing after the bounded propagation window;
- the dry-run artifact does not contain the reconciliation inventory;
- live schema evidence fails;
- the object-evidence artifact is missing;
- dossier generation fails;
- the generated dossier report is missing;
- the exact-SHA decision template cannot be retained.

The bootstrap state artifact is uploaded with `if: always()` so a partial chain still leaves diagnostic provenance. A partial or blocked bundle never grants release credit for artifacts that were not actually produced and validated.

## Human boundary after bootstrap

After `HUMAN_MIGRATION_REVIEW_READY`:

1. review every migration dossier;
2. classify every migration using the canonical decision schema;
3. use an independent approver distinct from item reviewers;
4. commit only the canonical decision evidence file;
5. run the protected Decision Gate against the immutable subject SHA;
6. continue to Execution Plan and Staging Rehearsal only after the decision gate accepts the reviewed evidence.

No shortcut in this workflow may be interpreted as approval to execute SQL in production.
