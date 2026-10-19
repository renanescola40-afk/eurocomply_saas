# RISCK COMPLY — isolated logical recovery kit (DRAFT)

**Status: NOT EXECUTED / NOT ACCEPTED.** This is an operator-controlled prototype, not evidence of a production backup. Never run against production until security review, credential scope review, cost confirmation, and a dry run with synthetic data are complete.

## Safety prerequisites
- Trusted executor with PostgreSQL 17 client utilities, Docker, age, Python 3, sha256sum, and adequate private storage.
- PostgreSQL source URL from a secure secret manager, scoped for read-only logical export; verify its permissions are sufficient to export the intended objects. No secret in chat, PR, logs or workflow inputs.
- Use a `postgresql://` or `postgres://` URL naming one explicit TCP host, with **no query string or fragment**. Remove all URI options, including `sslmode=verify-full`; percent-encoded credentials remain supported. Unix-socket and multi-host URLs are deliberately unsupported.
- `PGSSLMODE=verify-full` and `PGSSLROOTCERT` referencing a trusted CA file. Leave `PGSERVICE` unset: service-file settings and URI options can override environment defaults. The script rejects these inputs before invoking external tools.
- This fail-closed input policy replaces the unsafe substring check from PR #2539, which accepted conflicting duplicate `sslmode` parameters. It does not constitute proof of a real TLS connection or backup.
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

## Offline guard regression
Run `bash tests/recovery/isolated-logical-restore-tls.test.sh`. Synthetic inputs exercise the real entry script with an empty executable search path. Accepted inputs stop at the missing-client prerequisite; rejected inputs stop at the input guard. No database, Docker container, export or recovery is attempted. Revert the recovery change as one unit if necessary; do not execute the older permissive guard.

## Connection transport decision
Do not put an entire connection URI in `PGDATABASE`: the native libpq clients used by the rehearsal attempted a local socket instead of the URI host. `prepare-libpq-connection.py` reads the query-free source URI from the environment and prepares explicit `PGHOST`, `PGPORT`, `PGUSER`, and database-name fields. It requires an explicit username, password and database, rejects controls/malformed encodings, and writes the escaped password to an exclusive mode-0600 temporary `PGPASSFILE`. The password is never emitted in helper output or passed in argv. Inherited `PGPASSWORD` and `PGHOSTADDR` are cleared. The password file and connection metadata are removed after a successful export; the existing trap removes the private temporary directory on failure. Use only a trusted executor and never enable shell tracing.

Run `python3 tests/recovery/libpq-connection.test.py` for offline credential transport tests. Synthetic CI evidence must identify the exact tested script blob and validation commit; it does not prove production recovery or full Supabase managed-state restoration. PostgreSQL reference: https://www.postgresql.org/docs/17/libpq-envars.html and https://www.postgresql.org/docs/17/libpq-pgpass.html .

## Dump streaming correction
For custom-format archives, omit `--file` to stream to stdout. The native PostgreSQL17.6 rehearsal rejected the older `--file=-` invocation because it tried to open a literal file named `-`. On a writable working directory that form could leave an unencrypted dump instead of feeding age. The corrected pipeline is `pg_dump --format=custom --no-owner --no-acl | age ...`; the synthetic rehearsal verifies ciphertext, integrity failures, successful independent restoration and the absence of a plaintext dump file in the output directory. Production recovery remains NOT TESTED.
