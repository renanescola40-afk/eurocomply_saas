# RISCK COMPLY — isolated logical recovery kit (DRAFT)

**Status: NOT EXECUTED / NOT ACCEPTED.** This is an operator-controlled prototype, not evidence of a production backup. Never run against production until security review, credential scope review, cost confirmation, and a dry run with synthetic data are complete.

## Safety prerequisites
- Trusted executor with PostgreSQL 17 client utilities, Docker, age, sha256sum, and adequate private storage.
- PostgreSQL source URL from a secure secret manager, scoped for read-only logical export; verify its permissions are sufficient to export the intended objects. No secret in chat, PR, logs or workflow inputs.
- `PGSSLMODE=verify-full` and `PGSSLROOTCERT` referencing a trusted CA file.
- `RISCK_AGE_RECIPIENT` (public recipient), `RISCK_AGE_IDENTITY_FILE` (private identity file), `RISCK_RESTORE_PASSWORD` (isolated disposable database), and `RISCK_RECOVERY_OUTPUT_DIR` (private directory). Do not commit any of these secrets.
- Ensure the executor is authorized to handle sensitive data. The encrypted dump contains customer data even if its contents are not human-readable.
- A host with local PostgreSQL client tools and Docker is required. This script cannot run natively on an iPhone.
- This kit is not wired into CircleCI, GitHub Actions or Vercel; it cannot incur CI minutes automatically.

## Execution
Use a secure local terminal with the environment configured by the operator, then run `bash scripts/recovery/isolated-logical-restore.sh`. Do not use `bash -x` or echo environment variables.

The script creates an encrypted logical dump, a SHA-256 checksum and a minimal restore-evidence file. It starts a disposable network-isolated PostgreSQL 17 container, restores the encrypted dump into it and checks that public tables exist.

## Known limitations / release gates
- The restore may fail on Supabase-managed schemas, extensions, owners or privileges. That failure is a blocker, not a reason to weaken source production security.
- An encrypted logical PostgreSQL dump is **not** a full Supabase disaster-recovery backup. Storage object bytes, Auth provider configuration, edge functions, environment secrets, managed roles, and external integrations require separate documented recovery.
- The current script verifies only basic logical restore and public table presence. It does not yet verify row counts, referential integrity, cross-tenant isolation, restore timing, or full application runtime.
- The age private key must remain available outside the executor and must never be uploaded to the repo or artifacts.
- No automated production migration or deployment is permitted based solely on this prototype.
- Production backup acceptance requires independently reviewed test evidence and recovery perimeter sign-off.
