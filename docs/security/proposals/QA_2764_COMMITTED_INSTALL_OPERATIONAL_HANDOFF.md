# #2764 — Committed V2 QA installation operational handoff

Scope: QA zrxrrfbllsxtleyxjpsz ONLY. Production READ-ONLY. Zero new costs.
Prior approvals #7174475275 and #7176689464, successful rehearsal #7194134284,
and genuine signed session prerequisite #7198491894 remain valid. Do not rerun.

## 1. Local preparation (no database writes)

Use an existing authorized local checkout or already-funded/free existing workspace,
not a newly provisioned Codespace. From the checkout, fetch the existing QA branch
if needed, and run the preparation helper from exact commit
`b3d0c8e7225a32548765def17de0a50d408de239`:

```bash
git fetch origin qa/2764-restricted-bootstrap-integration
git show b3d0c8e7225a32548765def17de0a50d408de239:scripts/qa/qa-2764-prepare-versioned-install.sh > /tmp/qa-2764-prepare-versioned-install.sh
bash /tmp/qa-2764-prepare-versioned-install.sh
```

The helper pins CLI 2.122.1, creates a fresh workspace outside the checkout,
retains npm lockfile, invokes migration new, copies exact Git blob
c9f4fcb54034465c7fa4cc95f02d0fc2d9d531ca and verifies both Git SHA-1 and SHA-256
9bd1146112c1ee46d87ed7cf4c8ed0797a71efed696ba03b102694c879f67bc3.
Retain actual generated version and LOCAL_PREPARATION_PASS. No timestamp guessed.
No remote CLI command occurs during preparation. Do not place this QA-only file
in the application migration tree or run db push/migration up.

## 2. Validate result retention in authenticated QA SQL Editor

This is a new result-display/capture check, not a repeat of the transaction
or rollback rehearsal. In the authenticated QA project SQL Editor, submit the
following single harmless read-only transaction, and confirm the editor retains
both rows from SELECT immediately before COMMIT as well as successful execution.
These rows are conspicuously labeled probe-only and are NOT installation hashes.

```sql
BEGIN READ ONLY;
SELECT 'CAPTURE_PROBE_ONLY_A' AS function_signature, repeat('a',64) AS provenance_sha256
UNION ALL SELECT 'CAPTURE_PROBE_ONLY_B', repeat('b',64)
ORDER BY 1;
COMMIT;
```

Save the result (CSV export if available, otherwise screenshot and exact copied
values), query execution status, and QA project identity. If the editor does not
retain both result rows or successful execution status, STOP before install.
Never put dummy hashes into the actual manifest.

## 3. Execute committed installation once

Confirm the coordinated exclusive QA DDL window remains in force; recheck
concurrency immediately before submitting. All QA schema operators/workflows
must refrain from schema/migration operations through verification and history
reconciliation. Use the exact generated migration file, complete single editor
submission, no selected fragment, no extra SQL, no edits. The last SELECT before
COMMIT emits the original provenance manifest. Save both original rows plus
editor success/no-error status and execution time in the protected change
record and local workspace as install-manifest.csv (or exact transcription
accompanied by original screenshot). Required columns: function_signature,
provenance_sha256. Exactly these functions:
public.get_my_mfa_bootstrap_context()
app_private.qa_require_ai_inventory_actor(uuid).
Record generated migration version, source SHA256 and project. Do not store tokens.
Treat execution success as provisional pending independent post-COMMIT persistence.

If the install returns an error, ambiguous status or missing provenance, STOP;
do not rerun or regenerate fingerprints from the catalog. Retain all evidence.
No manual migration history edits.

## 4. Independent verification (new request, not part of install)

Executor runs the existing exact read-only post-COMMIT verifier
dedfd437015830edabbb3e5c8ddc86019c6d9444 against QA and compares both returned
fingerprints to the retained ORIGINAL install-time rows, verifies actual
persisted function definitions/owner/ACL/RLS and runs security advisors.
Record comparison independently with provider evidence. Do not use the
readback as substitute provenance. If different, stop; rollback only with
the original approved manifest, matching provenance and governed procedure.

## 5. Reconcile history only after verified COMMIT and fingerprint match

In the actual isolated workspace, use the pinned CLI binary. Inspect help for
link and migration repair. Link explicitly to the QA project ref
zrxrrfbllsxtleyxjpsz using an existing authorized account; do not create or
request new credentials, do not reveal them. Check that the linked ref is
exactly QA in supabase/.temp/project-ref. Confirm migration new generated the
version, exact bytes still match, and provider history is the 12 baseline
entries with this version absent. Use documented migration repair --status applied
for this ONE verified version only, with explicit linked target. No automatic
approval flags, no migration up/db push, no marking unexecuted changes.
For pinned v2 CLI, consult actual help before executing:
```bash
"$WORKSPACE/node_modules/.bin/supabase" link --project-ref zrxrrfbllsxtleyxjpsz
test "$(cat "$WORKSPACE/supabase/.temp/project-ref")" = zrxrrfbllsxtleyxjpsz
"$WORKSPACE/node_modules/.bin/supabase" migration repair --help
# Only after independent verification, and from the isolated workspace:
"$WORKSPACE/node_modules/.bin/supabase" migration repair "$(cat qa-migration-version.txt)" --status applied --linked
```
Run independent provider migration history readback and verify exactly one new
version (13 entries) with all 12 original entries intact, retain migration name
and version. Do not apply the SQL again. If the CLI does not support the
specified option, stop and consult its exact pinned help; do not change target.
Release window after reconciliation. No production deployment.

M5.4 still requires reviewed installed capability integrated into application
with no preview admin secret. M5.5 requires genuine signed RPC allow/deny
(actor/session/role/tenant/quota), not merely catalog or historical provider MFA.
The commercial fixture and trusted private transport retain separate review
requirements. No artificial paid authority or grants to expose the private guard.
