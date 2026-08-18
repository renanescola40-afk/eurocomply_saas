# Supabase Forward Reconciliation Lane

## Purpose

This lane rehearses, dry-runs and — only after explicit protected approval — promotes a small reviewed, forward-only reconciliation set without reclassifying, repairing or accidentally deploying the repository's unresolved historical migration backlog.

It remains intentionally separate from the global migration-reconciliation gate. The global gate is still authoritative for historical lineage repair and historical migration classification. **Production promotion in this lane nevertheless requires a successful protected human migration Decision Gate whose accepted decisions cover every selected migration byte as `PENDING_DEPLOYMENT`.** The bounded lane may narrow execution scope, but it may not bypass human classification.

## Authoritative selected set

`config/supabase-forward-reconciliation.json` is the **only authoritative source** for the currently selected forward migrations. Do not duplicate the full list or a fixed migration count in this runbook: the set evolves as reviewed forward identities are added, and stale prose must never be accepted as promotion evidence.

For every rehearsal, dry-run and production promotion, compile the manifest from the exact current release SHA and require the same:

- ordered filenames and versions;
- source-byte SHA-256 values;
- migration count derived from the manifest;
- immutable selection digest;
- exact release SHA.

All selected execution identities must remain strictly later than the remote migration head observed immediately before promotion. No selected version may already be recorded remotely. The lane never requires `--include-all`, migration-history repair or manual ledger insertion.

### Current Gap Analysis/remediation closure ordering

When present in the authoritative manifest, the following three migrations form one ordered security boundary and must remain contiguous/in this order:

1. `20260816104000_guard_compliance_task_browser_mutations.sql` — installs RESTRICTIVE fail-closed authenticated INSERT/UPDATE/DELETE guards before any compatibility widening;
2. `20260816104500_reconcile_gap_remediation_persistence.sql` — forward-reconciles the unapplied `20260605_*` Gap Analysis/remediation/evidence schema effects without recreating `public.workspaces`;
3. `20260816110000_harden_gap_personal_task_write_boundary.sql` — restores the steady-state backend-only organization mutation boundary and releases only authenticated, owner-bound personal task creation.

This ordering protects partial rollout: if execution stops after the guard or compatibility step, authenticated task mutations remain fail-closed. Any byte or ordering change invalidates prior Stage 1/Stage 2 evidence.

### Active core runtime reconciliation

The historical `20260809135000_enterprise_core_runtime_schema_reconciliation.sql` remains byte-for-byte immutable and unapplied. It is not selected because its version precedes the current production migration ledger.

`20260814101500_reconcile_enterprise_core_active_runtime.sql` is the forward execution identity for the already-reviewed reconciliation intent. Read-only production inspection has shown concrete application/schema drift including absent Intelligence and notification-dedupe runtime objects plus the missing vendor review date contract. The selected forward identity reconciles those runtime objects while restoring the canonical RLS/runtime boundary and atomic organization bootstrap contract.

### Break-Glass and enterprise control plane

`20260813234000_reconcile_enterprise_break_glass_governance.sql` is the forward-only reconciliation for the unapplied historical Break-Glass migration. The selected enterprise licensing, integrations/SCIM, billing-lifecycle and contract-control migrations likewise remain bound to their exact current bytes rather than being substituted with history repair.

### Live-RLS helper privilege reconciliation

`20260815083000_reconcile_live_rls_validation_inventory_privileges.sql` reissues the required service-role-only helper privilege boundary under a version later than the current production head. It preserves `SECURITY INVOKER`, a fixed search path and removes browser-role execution.

The control plane compiles the exact Git SHA, filenames, versions, byte sizes and SHA-256 digests into one immutable selection digest. Changing any selected SQL byte, filename, order or release SHA changes that digest and invalidates prior rehearsal/dry-run evidence.

## Administrative prerequisites

Production evidence is valid only when the live GitHub provider configuration satisfies the same fail-closed boundary enforced by the workflows.

Before Stage 1 or Stage 2:

1. harden `supabase-production-migration-dry-run` so administrator bypass is disabled;
2. configure at least one required deployment reviewer;
3. restrict deployments to protected branches only;
4. rotate/correct `SUPABASE_DB_POOLER_URL` after the credential incident tracked by #1620;
5. verify the replacement contains no embedded CR/LF/control characters and update every authorized dependent location without publishing it.

Before Stage 3 production promotion, `Production` must also have:

1. administrator bypass disabled;
2. at least one required deployment reviewer;
3. protected-branches-only deployment policy;
4. the canonical rotated `SUPABASE_DB_POOLER_URL` secret;
5. a successful protected `Supabase Migration Reconciliation Decision Gate` run whose `head_sha` is the exact release/evidence commit being promoted;
6. an accepted human decision artifact whose immutable subject SHA is supplied to promotion and whose reviewed `PENDING_DEPLOYMENT` items cover every selected filename and SHA-256 byte digest.

The Stage 3 workflow performs an unprotected read-only governance preflight before its protected job can load `Production` secrets. A name containing `production` is never accepted as protection evidence by itself.

## Stage 1 — isolated production-restore rehearsal

Run `Supabase Forward Reconciliation Rehearsal` manually from the exact current `main` SHA after the Stage 1 administrative prerequisites are satisfied.

The workflow:

1. proves the supplied SHA is exact current `main`;
2. compiles the immutable selected manifest;
3. reads production through the protected pooler credential;
4. restores production into a disposable runner-local database;
5. verifies every selected SHA-256 before application;
6. applies only the selected files to the isolated target, in manifest order;
7. runs `scripts/supabase/verify-forward-reconciliation-postconditions.sql`;
8. requires active-core, Step-Up, controlled-storage, Break-Glass, enterprise-control and any current manifest-specific postconditions;
9. emits redacted exact-SHA attestation evidence;
10. destroys the disposable database.

A Stage 1 PASS does not authorize production deployment. A PR-event rehearsal job that only validates the manifest/contract is not a substitute for the protected isolated-production-restore job.

## Stage 2 — filtered remote dry-run

Run `Supabase Forward Reconciliation Dry Run` with the same exact current `main` SHA and the successful Stage 1 run ID.

It revalidates source workflow/SHA/conclusion and attestation provenance, then creates a temporary workdir containing exactly:

- every version currently recorded in remote migration history; plus
- the exact selected forward set from the immutable manifest.

It proves the selected versions remain after the remote head, no selected migration is already remote, the pending set equals the selected set, and no unauthorized pending migration exists. Only then does it execute a filtered `supabase db push --dry-run` against production.

Stage 2 performs no production write. A PR-event contract job is non-crediting for the protected remote dry-run.

## Stage 3 — human-approved bounded production promotion

`Supabase Forward Reconciliation Production Promotion` is the only executor for this bounded lane. It is manual and fail-closed; merging repository code does not run it.

Dispatch requires:

- exact current `main` SHA;
- successful exact-SHA Stage 1 run ID;
- successful exact-SHA Stage 2 run ID;
- successful protected human migration Decision Gate run ID;
- exact human decision subject SHA reviewed by that gate;
- explicit confirmation `PROMOTE <release_sha> USING DRY-RUN <dry_run_run_id> AND DECISION <decision_run_id>`;
- successful `Production` environment governance preflight;
- protected human deployment approval before secrets become available.

The Decision Gate is a separate human-evidence boundary, not a production authorization shortcut. Its successful run must be a `workflow_dispatch` of `.github/workflows/supabase-migration-reconciliation-decision-gate.yml`, have `head_sha` equal to the exact release/evidence commit, and produce accepted decision artifacts. `scripts/supabase/verify-forward-human-approval.mjs` then proves every migration in the forward manifest is present with the same SHA-256 bytes in the accepted `PENDING_DEPLOYMENT` plan and has reviewer, schema-evidence and rollback provenance. The generated promotion artifact intentionally stores none of the human names or approval-reference strings.

Immediately before the write the workflow:

1. verifies current `main` still equals the release SHA;
2. verifies rehearsal, dry-run and Decision Gate paths, SHAs/events and conclusions;
3. downloads source evidence without exposing credentials;
4. recompiles the selected manifest and matches the exact selection digest to Stage 1 and Stage 2;
5. validates every selected migration byte against the accepted human `PENDING_DEPLOYMENT` artifacts and emits a redacted `human-approval-proof.json`;
6. fetches the current production migration history into a fresh temporary workdir;
7. verifies every selected source file SHA-256;
8. reruns the forward-version-order and exact-pending-set proofs against current remote state;
9. executes one final filtered dry-run;
10. rechecks both current `main` and the redacted human-approval proof immediately before the production write;
11. executes exactly one filtered `supabase db push` with no `--include-all` and no migration-history repair.

After the write it:

1. captures the remote migration ledger again;
2. requires `remote-after = remote-before + exactly selected set` using `scripts/supabase/verify-forward-promotion-transition.mjs`;
3. rejects any unauthorized extra migration, missing historical version or partial selected set;
4. runs the canonical live read-only schema/security postconditions;
5. fails the release evidence if `main` moved while the controlled promotion was executing;
6. uploads only redacted manifests/proofs/ledger-version evidence and never stores database URLs, credentials, row data, human reviewer names or approval-reference values.

A successful Stage 3 proves the selected forward set was human-reviewed and promoted safely. It does not classify or repair any historical migration outside that set.

## Prohibited shortcuts

Do not replace any stage with:

- ad-hoc direct production SQL;
- `db push --include-all`;
- migration-history repair;
- manual insertion into `supabase_migrations.schema_migrations`;
- filename-only or catalog-only equivalence;
- automatic classification of historical migrations;
- a production write without successful exact-SHA rehearsal, filtered dry-run and accepted protected human Decision Gate provenance.

## Rollback boundary

The selected migrations are forward-only. Rollback never means deleting migration-ledger history. If a schema-level correction is required after promotion, it must be a new reviewed forward change compatible with the application rollback/LKG strategy. Deployment rollback, database restore and incident recovery remain governed by their separate protected workflows and runbooks.

## Historical backlog remains separate

This lane does not close or alter the unresolved historical migration-reconciliation program. Fingerprint-backed provenance still requires remaining human owner decisions and independent approval before the global historical gate can open.

The lane's narrower purpose is to move a specifically reviewed active runtime set through isolated rehearsal, filtered remote dry-run, accepted human selected-set classification and a deliberate protected production promotion without exposing production to the unresolved historical backlog.
