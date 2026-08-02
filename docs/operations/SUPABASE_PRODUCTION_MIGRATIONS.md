# Supabase production migration deployment

## Purpose

Keep the production Supabase schema synchronized with reviewed SQL files without relying on linked-project discovery, duplicated passwords or unrestricted historical execution.

The read-only drift audit and dry-run must complete before the manual production deployment workflow is considered.

## Canonical GitHub environment secrets

Configure the following in every protected environment that performs production database reads or writes, including `production` and `supabase-production-migration-dry-run`:

- `SUPABASE_PROJECT_ID`: the exact 20-character production project reference;
- `SUPABASE_DB_POOLER_URL`: the complete Session Pooler URI copied from **Supabase → Connect** for that project, including the current database password.

`SUPABASE_DB_POOLER_URL` is the single canonical database endpoint and credential. The migration workflows must not depend on separate `SUPABASE_DB_URL` and `SUPABASE_DB_PASSWORD` values because independent rotation creates credential drift.

### Creating the canonical URI

1. Open the exact production project in Supabase.
2. Select **Connect → Session Pooler**.
3. Copy the URI using port `5432` and username `postgres.<project-ref>`.
4. Replace the password placeholder with the current database password when the dashboard has not already done so.
5. Save the complete URI as `SUPABASE_DB_POOLER_URL` in the protected GitHub environments.
6. Never put quotes around it or paste it into workflow inputs, issues, logs, screenshots or public Vercel variables.

The resolver removes accidental CR/LF characters and boundary whitespace, canonicalizes reserved password characters, validates the project reference and approved Supabase endpoint, and writes the resulting connection to an owner-readable temporary file. It does not discover a different endpoint or print credentials.

## Credential rotation

When the Supabase database password changes:

1. copy a fresh Session Pooler URI from the same project;
2. replace `SUPABASE_DB_POOLER_URL` in every protected GitHub environment that uses production database workflows;
3. rerun the read-only drift audit;
4. do not start a production write until the exact-SHA audit and dry-run can authenticate.

A structurally valid connection that returns `SQLSTATE 28P01` contains a password rejected by the database. Waiting does not convert an incorrect secret into evidence.

## Production controls

The production workflow:

1. requires `APPLY_SUPABASE_MIGRATIONS` and the exact current `main` SHA;
2. verifies the checked-out SHA and remote `main` before work begins;
3. validates `SUPABASE_DB_POOLER_URL` against `SUPABASE_PROJECT_ID`;
4. stores connection material only in a temporary mode-`0600` file;
5. blocks malformed migration names, invalid timestamps and duplicate versions;
6. pins and verifies the Supabase CLI version;
7. captures remote migration state;
8. blocks unresolved local/remote migration-history drift;
9. executes `supabase db push --dry-run` before any write;
10. applies only the reviewed pending migrations;
11. verifies migration history again;
12. verifies that `main` did not move during deployment;
13. removes temporary credentials and uploads only bounded evidence.

Production seeding, migration repair, `--include-all`, database reset and automatic confirmation are prohibited.

## Migration history reconciliation

The repository contains historical filename and duplicate-version debt. Never bypass it by renaming or deleting files blindly, running `--include-all`, or marking every local migration as applied.

Use this sequence:

1. Run **Supabase Migration Drift Audit** on the exact current `main` SHA.
2. Preserve its artifact even when the run concludes failure after producing a complete fail-closed inventory.
3. Run **Supabase Migration Reconciliation** with the same SHA and source run ID.
4. Classify every inventory item using object-level production schema evidence and independent review.
5. Require `READY_FOR_STAGING_REHEARSAL` before a staging clone execution.
6. Rehearse genuinely pending SQL in deterministic order with rollback evidence.
7. Create a separate bounded production execution plan.
8. Apply only the approved batch.
9. Rerun drift, RLS, runtime and application smoke evidence on the deployed SHA.

The reconciliation workflow accepts a red audit only when the source workflow, SHA, artifact name, required files, schemas and non-mutation safety markers all validate. Authentication-only artifacts are rejected.

## Manual read-only dry-run

Open **Actions → Supabase Production Migration Dry Run → Run workflow** from `main`.

Provide:

- `release_sha`: the full SHA at the tip of `main`;
- `confirmation`: `DRY_RUN_ONLY`.

A blocked deployability result is expected while historical debt remains. The run must still retain connection diagnostics, remote migration history and reconciliation review packages.

## Manual production execution

Open **Actions → Supabase Production Migrations → Run workflow** only after reviewed reconciliation and staging rehearsal.

Provide:

- `release_sha`: the same reviewed SHA still at the tip of `main`;
- `confirmation`: `APPLY_SUPABASE_MIGRATIONS`.

The protected `production` environment must require independent approval before secrets are released.

## Validation after deployment

Confirm:

- the intended versions appear in Supabase migration history;
- expected columns, constraints, functions, grants and policies exist;
- RLS and tenant isolation proofs pass;
- health, readiness and authenticated smoke tests pass;
- Stripe webhook and entitlement operations remain healthy when touched;
- artifacts reference the exact deployed SHA and contain no credentials.

## Rollback

SQL migrations are forward-only by default. Never run a production database reset.

For a failed rollout:

1. stop or isolate the affected feature when necessary;
2. preserve current database and runtime evidence;
3. create and independently review a compensating migration;
4. apply it through the same protected workflow;
5. validate data integrity, RLS and application runtime;
6. record the incident, exact SHAs, migration versions, operators, approvals and evidence digests.
