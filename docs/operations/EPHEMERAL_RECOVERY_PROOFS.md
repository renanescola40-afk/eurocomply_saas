# Ephemeral Supabase proof infrastructure

## Purpose

Protected Enterprise runtime proofs must not depend on a long-lived restore target or reuse the production database as a test target. The proof infrastructure therefore creates disposable Supabase/Postgres databases inside the GitHub-hosted runner and removes them after each job.

The generated local database URL is a per-job runtime value. It is masked in GitHub Actions, is never committed, and must never be copied into an artifact or ticket.

## Modes

### Exact-SHA project schema (`start-project`)

Use for proofs that need the database contract but do not need production row data:

- Final Technical Controls;
- Data Governance;
- Incident Continuity;
- Procurement Trust;
- Enterprise Integrations.

The provisioner starts Supabase Postgres 17, copies `supabase/migrations` from the exact checked-out SHA into the temporary project, runs `supabase db reset --local --no-seed`, and verifies that every committed migration version exists in `supabase_migrations.schema_migrations` before exposing the database to the proof.

Do not seed production data into this mode.

### Recovery restore target (`start`)

Use only for the isolated backup/restore exercise. This target is intentionally created without applying the repository migrations first, because the exercise restores the source database's logical backup into a clean Supabase Postgres target.

The backup sequence is:

1. filtered roles;
2. schema;
3. complete data using COPY.

The restore is transactional. The evidence verifies aggregate counts for critical public tables and `auth.users`, RLS state, policy presence, RPO, and RTO. Dump contents and row data are not retained.

## Version compatibility

Production currently runs PostgreSQL 17.6. The local proof project sets Supabase `db.major_version = 17` and fails closed unless the running server reports the expected 17.6 line. The Supabase CLI is pinned in the protected workflows.

Do not silently downgrade the local proof database or use the Ubuntu runner's PostgreSQL 16 dump utilities for a PostgreSQL 17 production source.

## Network boundary

The connection URL used by proof scripts must resolve to loopback (`127.0.0.1`, `localhost`, or `::1`). Docker port publication is checked separately because Docker may publish a local service on wildcard interfaces even when callers use a loopback URL.

If a wildcard PostgreSQL binding is observed, the provisioner installs temporary host and Docker `DOCKER-USER` DROP rules before a proof or restore can run. Unknown bindings fail closed. The binding and firewall state are revalidated after `supabase db reset` because reset may recreate local containers.

The firewall rules are tagged with the per-run project identifier and are removed during `always()` cleanup.

## Cleanup

Every protected workflow using the disposable database must contain an `always()` cleanup step calling:

```text
node scripts/recovery/manage-ephemeral-recovery-database.mjs stop
```

Cleanup stops Supabase with `--no-backup`, removes the temporary work directory/local volumes, and removes temporary firewall rules.

The backup/restore exercise separately deletes all roles/schema/data dump files in a `finally` block.

## Evidence boundary

Allowed evidence:

- exact SHA and workflow/run identifiers;
- PASS/FAIL checks;
- aggregate row counts needed to demonstrate integrity;
- RPO/RTO timings;
- truncated backup digest;
- redaction/integrity booleans.

Never store:

- database connection URLs;
- database passwords or service credentials;
- SQL dump contents;
- customer rows or exported payloads;
- raw auth records;
- local Docker volume contents.

## Production recovery source

A true backup/restore exercise still requires protected read access to the production recovery source through `RECOVERY_SOURCE_DATABASE_URL`. Removing the long-lived isolated target does **not** remove this source credential and does not permit using production as the restore destination.

The controlled Vercel rollback portion of the recovery exercise keeps its independent confirmation phrase, last-known-good deployment controls, and protected Vercel credentials.
