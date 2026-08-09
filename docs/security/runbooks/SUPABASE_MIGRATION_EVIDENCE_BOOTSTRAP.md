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

Artifact lookup allows a short bounded retry window because the Actions artifact index can become visible shortly after a child run reaches `completed`. The retry does not weaken evidence requirements: the exact expected artifact name and numeric artifact ID are still mandatory, otherwise the bootstrap fails closed.

## Provenance bundle

The bootstrap artifact is named:

`supabase-migration-evidence-bootstrap-<subject-sha>`

It contains:

- `bootstrap-state.json` with child workflow run IDs, conclusions and artifact names;
- `migration-reconciliation-inventory.json`;
- `migration-object-evidence.json`;
- `migration-review-dossiers.json`;
- `decision-template.json`;
- `SHA256SUMS` over the retained review inputs.

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
- an expected immutable artifact is still missing after the bounded propagation window;
- the dry-run artifact does not contain the reconciliation inventory;
- live schema evidence fails;
- the object-evidence artifact is missing;
- dossier generation fails;
- the generated dossier report is missing;
- the exact-SHA decision template cannot be retained.

The bootstrap state artifact is uploaded with `if: always()` so a partial chain still leaves diagnostic provenance.

## Human boundary after bootstrap

After `HUMAN_MIGRATION_REVIEW_READY`:

1. review every migration dossier;
2. classify every migration using the canonical decision schema;
3. use an independent approver distinct from item reviewers;
4. commit only the canonical decision evidence file;
5. run the protected Decision Gate against the immutable subject SHA;
6. continue to Execution Plan and Staging Rehearsal only after the decision gate accepts the reviewed evidence.

No shortcut in this workflow may be interpreted as approval to execute SQL in production.
