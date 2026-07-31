# Supabase production migration deployment

## Purpose

Keep the production Supabase schema synchronized with the versioned SQL files in `supabase/migrations` without relying on automatic pooler discovery.

The workflow `.github/workflows/supabase-production-migrations.yml` is manual-only and operates against the exact current `main` SHA. The read-only workflow `.github/workflows/supabase-production-migration-dry-run.yml` must be used first to capture migration history and reconciliation evidence.

## Required GitHub environment secrets

Configure these under both protected GitHub Environments:

- `supabase-production-migration-dry-run` for read-only reconciliation;
- `production` for drift auditing and explicitly approved production deployment.

Required secrets:

- `SUPABASE_PROJECT_ID`: the 20-character production project reference shown in the Supabase dashboard URL.
- `SUPABASE_DB_URL`: the complete, percent-encoded PostgreSQL connection string copied from **Supabase → Connect** for the same project.

`SUPABASE_DB_PASSWORD` is no longer consumed by these workflows. Keeping a standalone password and asking the CLI to rediscover a pooler caused ambiguous authentication failures and could connect through a different transport than the operator reviewed.

### Creating `SUPABASE_DB_URL`

1. Open the exact production project in Supabase.
2. Select **Connect**.
3. Choose either:
   - **Session pooler** on port `5432` for the broadest GitHub-hosted runner compatibility;
   - **Direct connection** on port `5432` when the runner has compatible network access;
   - **Transaction pooler** on port `6543` only when explicitly reviewed for the intended CLI operation.
4. Copy the complete URI connection string.
5. Replace the password placeholder with the current database password.
6. Percent-encode password characters when the copied URI requires it.
7. Store the resulting URI directly as the GitHub Environment secret `SUPABASE_DB_URL`.

Do not put quotes around the value. Do not paste it into repository files, comments, screenshots, workflow inputs, Vercel public variables, or issue bodies.

GitHub and browser secret editors can accidentally preserve line breaks while a long URI is pasted. The repository removes CR/LF characters and adjacent indentation before parsing the URI. This normalization does not weaken endpoint validation: literal spaces or tabs, control characters, foreign hosts, wrong projects, unsupported ports, missing passwords and URL fragments still fail closed.

The repository validates that the normalized URL:

- uses `postgres://` or `postgresql://`;
- points only to an approved Supabase database or pooler hostname;
- uses port `5432` or `6543`;
- targets the `postgres` database;
- contains a password;
- identifies the same project as `SUPABASE_PROJECT_ID`;
- contains no remaining literal whitespace, disallowed control characters or unencoded URL fragment;
- is written only to an owner-readable temporary runner file.

Only non-secret diagnostics are retained: transport, hostname, port, database, project-reference suffix, whether outer whitespace was removed and the number of removed line breaks. The URI, username and password are never retained.

## Production controls

The production workflow:

1. requires `APPLY_SUPABASE_MIGRATIONS` and the exact current `main` SHA;
2. checks out that SHA directly and verifies remote `main` still matches;
3. normalizes and validates `SUPABASE_DB_URL` against `SUPABASE_PROJECT_ID`;
4. stores the normalized URL in a temporary file with mode `0600`;
5. validates local migration filenames and versions;
6. uses a pinned and verified Supabase CLI version;
7. captures remote migration state with `supabase migration list --db-url`;
8. blocks on any unresolved local/remote migration-history drift;
9. executes `supabase db push --db-url ... --dry-run` before any write;
10. applies only pending migrations after the dry-run and protected-environment approval;
11. captures migration history again and fails if drift remains;
12. verifies that `main` did not move during the deployment window;
13. removes temporary connection material even on failure;
14. uploads bounded evidence without credentials.

Production seeding, migration repair, `--include-all`, remote database reset and automatic confirmation are deliberately excluded.

## First deployment and existing remote drift

The first run may fail when the production database was created or modified manually and its migration history does not match the repository.

Do not bypass this by automatically using `--include-all`, resetting production, deleting migration files, or marking every local migration as applied.

Instead:

1. preserve a database backup or verified logical dump;
2. run **Supabase Production Migration Dry Run** against the exact current `main` SHA;
3. download the retained remote-history and reconciliation-review artefacts;
4. identify schema changes already present remotely;
5. reconcile only independently confirmed historical entries;
6. rerun the dry-run;
7. rehearse the bounded batch in staging;
8. deploy only after the preview contains the intended pending migrations.

Migration-history repair is a production change and requires a separate reviewed operation. The automated deployment workflow does not execute it.

## Manual dry-run

Open **Actions → Supabase Production Migration Dry Run → Run workflow** from `main`.

Provide:

- `release_sha`: the full 40-character SHA currently at the tip of `main`;
- `confirmation`: `DRY_RUN_ONLY`.

A blocked deployability result is expected while unresolved history exists. The run must still produce connection diagnostics, remote migration history and reconciliation packages.

## Manual production execution

Open **Actions → Supabase Production Migrations → Run workflow** from `main` only after the dry-run and independent review are complete.

Provide:

- `release_sha`: the same reviewed full SHA still at the tip of `main`;
- `confirmation`: `APPLY_SUPABASE_MIGRATIONS`.

The `production` environment must require an independent approval before secrets are released.

## Validation after deployment

Confirm in Supabase:

- **Database → Migrations** shows the intended migration versions;
- **Database → Policies** reflects the intended RLS changes;
- application health and readiness endpoints remain healthy;
- an authenticated smoke test succeeds;
- tenant-isolation and Stripe webhook server-side operations still pass when touched by the migration;
- the retained artefact references the exact deployed SHA and contains no credentials.

For migration `20260725214500_harden_permissions_catalog_rls.sql`, specifically verify:

- RLS enabled on `permissions`;
- RLS enabled on `role_permissions`;
- authenticated read-only catalog access;
- no frontend writes to either RBAC catalog;
- no `anon` or `authenticated` Data API access to `stripe_webhook_events`;
- service-role Stripe webhook idempotency writes continue working.

## Rollback

SQL migrations are forward-only by default. Never run `supabase db reset --db-url` or `supabase db reset --linked` against production.

For a failed rollout:

1. stop application traffic or disable the affected feature when necessary;
2. preserve current database evidence;
3. create and independently review a compensating migration;
4. apply the compensating migration through the same protected workflow;
5. validate data integrity, RLS behavior and application runtime;
6. record the incident, exact SHAs, migration versions, operators, approvals and evidence digests.
