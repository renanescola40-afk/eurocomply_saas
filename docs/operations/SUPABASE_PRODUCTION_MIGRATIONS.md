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
- `SUPABASE_DB_URL`: the complete PostgreSQL connection string copied from **Supabase → Connect** for the same project.

Optional compatibility secret for the read-only dry-run environment:

- `SUPABASE_DB_PASSWORD`: the current raw database password. When present, the resolver replaces only the password component of the already validated `SUPABASE_DB_URL`. It does not rediscover or change the endpoint, project, username, port or database.

The standalone password override exists to recover from a stale password embedded in an otherwise correct protected URL. It is scoped only to the connection-preparation step and is never printed, uploaded or made available job-wide.

### Creating `SUPABASE_DB_URL`

1. Open the exact production project in Supabase.
2. Select **Connect**.
3. Choose either:
   - **Session pooler** on port `5432` for the broadest GitHub-hosted runner compatibility;
   - **Direct connection** on port `5432` when the runner has compatible network access;
   - **Transaction pooler** on port `6543` only when explicitly reviewed for the intended CLI operation.
4. Copy the complete URI connection string.
5. Replace the password placeholder with the current database password, or configure the optional protected password override in the read-only environment.
6. Store the resulting URI directly as the GitHub Environment secret `SUPABASE_DB_URL`.

The resolver accepts either a correctly percent-encoded password or the raw password inside the official Supabase connection shape. It canonicalizes reserved password characters such as `#`, `@`, `/`, `?`, `:`, `%` and `!` before the URL is used. Existing valid `%HH` escapes are preserved and are not double-encoded. The same canonicalization applies to the optional protected password override.

Do not put quotes around secret values. Do not paste them into repository files, comments, screenshots, workflow inputs, Vercel public variables or issue bodies.

GitHub and browser secret editors can accidentally preserve line breaks or boundary spaces while a long URI or password is pasted. The repository removes CR/LF characters and adjacent indentation. For `SUPABASE_DB_PASSWORD`, it also removes only leading and trailing spaces or tabs introduced by the editor; whitespace remaining inside the password still fails closed. It then canonicalizes only the password portion of a connection string that already matches an approved Supabase endpoint shape. This normalization does not weaken endpoint validation: internal literal spaces or tabs, control characters, foreign hosts, wrong projects, unsupported ports, missing passwords and unsafe URL fragments still fail closed.

The repository validates that the normalized connection:

- uses `postgres://` or `postgresql://`;
- points only to an approved Supabase database or pooler hostname;
- uses port `5432` or `6543`;
- targets the `postgres` database;
- contains a password;
- identifies the same project as `SUPABASE_PROJECT_ID`;
- contains no remaining internal literal whitespace, disallowed control characters or unsafe URL fragment;
- is written only to an owner-readable temporary runner file.

Only non-secret diagnostics are retained: transport, hostname, port, database, project-reference suffix, whether URL or password boundary whitespace was removed, the number of removed line breaks, whether password encoding was canonicalized and whether the protected password override was used. The URI, username and password are never retained.

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

The optional standalone password override is initially enabled only in the read-only dry-run workflow. It must not be promoted to the write workflow until live authentication and dry-run evidence pass.

Production seeding, migration repair, `--include-all`, remote database reset and automatic confirmation are deliberately excluded.

## First deployment and existing remote drift

The first run may fail when the production database was created or modified manually and its migration history does not match the repository.

Do not bypass this by automatically using `--include-all`, resetting production, deleting migration files or marking every local migration as applied.

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

## Authentication failure boundary

Successful normalization proves only that the endpoint is structurally valid, points to the expected Supabase project and can be passed safely to the CLI. It does not prove that either credential source is current.

The read-only workflow first uses `SUPABASE_DB_PASSWORD` when that protected override exists; otherwise it uses the password embedded in `SUPABASE_DB_URL`. If the CLI still returns `SQLSTATE 28P01`, the database itself rejected the selected credential. Do not weaken the workflow or mark migration evidence complete. The current database password must then be reset or retrieved in the exact same Supabase project and placed in the protected environment.

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
