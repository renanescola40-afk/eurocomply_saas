# Storage Object Recovery Proof

Status: IMPLEMENTED / EXECUTION PENDING

This control proves the runtime mechanism for restoring a deleted Supabase Storage object without reading or copying customer files.

## Evidence producer

Workflow:

- `.github/workflows/storage-recovery-proof.yml`

Execution modes:

- a push to `main` that changes the workflow executes the proof against the exact pushed SHA;
- `workflow_dispatch` requires the exact current `main` SHA and `EXECUTE_ISOLATED_STORAGE_RECOVERY_PROOF`.

The workflow uses one fixed, allowlisted non-production recovery project:

- project ref: `wsjswdrwhyughactoxcf`
- expected project name: `risck-comply-s1-restore-2026-09-02`
- expected region: `eu-west-1`

The allowlist is bound to the immutable Git blob for `docs/trust/BACKUP_RESTORE_EVIDENCE_2026-09-24.md`. That retained evidence independently revalidated representative data-bearing lineage for this recovery environment, but explicitly states `BACKUP_MECHANISM_SOURCE=NOT_INDEPENDENTLY_ATTESTED`.

Therefore this workflow does **not** claim that the allowlisted target was produced by a specific provider restore operation. It proves Storage object backup/delete/restore mechanics on the documented isolated recovery environment only.

The workflow rejects Production and does not accept an arbitrary operator-supplied Supabase project ref.

## Runtime sequence

The protected workflow:

1. validates exact current `main`, including `GITHUB_REF_NAME`, `GITHUB_SHA`, checked-out SHA and the GitHub API `main` SHA;
2. validates the immutable allowlist evidence blob and its explicit non-attestation boundary;
3. validates the fixed target identity, project name, region and health through the Supabase Management API;
4. serializes all executions against a project-wide concurrency group so two runs cannot share the same function, nonce, bucket or object paths;
5. deploys a one-time Edge Function to the allowlisted recovery environment;
6. creates a private temporary Storage bucket;
7. uploads a synthetic object;
8. computes SHA-256;
9. copies the object to a backup path;
10. deletes the operational copy;
11. proves deletion by listing the runtime prefix and confirming the original object is absent;
12. restores the object from the backup copy;
13. downloads the restored object;
14. proves original / backup / restored SHA-256 equality;
15. requires in-function bucket cleanup to succeed;
16. removes the temporary function and nonce with bounded retries and fails the workflow if cleanup cannot be confirmed;
17. retains only redacted booleans, byte length, schema identifier and artifact provenance.

## Safety boundary

- Production Storage mutation: NO
- Customer object read: NO
- Customer object copied: NO
- Synthetic object only: YES
- Fixed allowlisted recovery project only: YES
- Arbitrary project ref accepted: NO
- Provider restore provenance claimed by this proof: NO
- Temporary function cleanup required: YES
- Temporary nonce cleanup required: YES
- Temporary bucket cleanup required: YES
- Concurrent runs sharing recovery resources: NO

## What PASS means

A successful run proves:

- `STORAGE_OBJECT_BACKUP_COPY_MECHANISM=PROVEN`
- `STORAGE_OBJECT_DELETE_DETECTION=PROVEN`
- `STORAGE_OBJECT_RESTORE_MECHANISM=PROVEN`
- `STORAGE_OBJECT_RESTORE_CHECKSUM=PROVEN`
- `STORAGE_OBJECT_SYNTHETIC_CLEANUP=PROVEN`

It does **not** by itself prove:

- that every Production customer object currently has an independent backup copy;
- that the allowlisted recovery environment came from a particular Supabase backup or restore operation;
- a current-exact-SHA provider-managed Production clone.

Those broader controls remain separate:

- `PRODUCTION_STORAGE_BACKUP_COVERAGE=OPEN`
- `CURRENT_EXACT_SHA_PROVIDER_CLONE=OPEN`

Do not convert this synthetic recovery-mechanism PASS into a claim of complete Production file-backup coverage or provider-restore provenance.
