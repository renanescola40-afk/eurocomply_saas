# Storage Object Recovery Proof

Status: IMPLEMENTED / EXECUTION PENDING

This control proves the runtime mechanism for restoring a deleted Supabase Storage object without reading or copying customer files.

## Evidence producer

Workflow:

- `.github/workflows/storage-recovery-proof.yml`

Required inputs:

- exact current `main` SHA
- a non-production Supabase project ref
- `EXECUTE_ISOLATED_STORAGE_RECOVERY_PROOF`
- `SUPABASE_RESTORE_TO_NEW_PROJECT_CONFIRMED`

The workflow rejects the Production Supabase project ref.

## Runtime sequence

The protected workflow:

1. validates exact current `main`;
2. validates the target project through the Supabase Management API;
3. deploys a one-time Edge Function to the isolated restore target;
4. creates a private temporary Storage bucket;
5. uploads a synthetic object;
6. computes SHA-256;
7. copies the object to a backup path;
8. deletes the operational copy;
9. proves the operational copy is absent;
10. restores the object from the backup copy;
11. downloads the restored object;
12. proves original / backup / restored SHA-256 equality;
13. removes the temporary bucket, objects, function, and nonce;
14. retains only redacted booleans, byte length, schema identifier, and artifact provenance.

## Safety boundary

- Production Storage mutation: NO
- Customer object read: NO
- Customer object copied: NO
- Synthetic object only: YES
- Isolated recovery project only: YES
- Temporary function removed after the drill: YES
- Temporary bucket cleanup required: YES

## What PASS means

A successful run proves:

- `STORAGE_OBJECT_BACKUP_COPY_MECHANISM=PROVEN`
- `STORAGE_OBJECT_DELETE_DETECTION=PROVEN`
- `STORAGE_OBJECT_RESTORE_MECHANISM=PROVEN`
- `STORAGE_OBJECT_RESTORE_CHECKSUM=PROVEN`

It does **not** by itself prove that every Production customer object currently has an independent backup copy.

That broader operational control remains separate:

- `PRODUCTION_STORAGE_BACKUP_COVERAGE=OPEN`

Do not convert a synthetic recovery-mechanism PASS into a claim of complete Production file-backup coverage.
