# Supabase production migration deployment

## Purpose

Keep the production Supabase schema synchronized with the versioned SQL files in `supabase/migrations`.

The workflow `.github/workflows/supabase-production-migrations.yml` runs after a migration or the workflow itself reaches `main`. It can also be dispatched manually against the exact current `main` SHA.

## Required GitHub production secrets

Configure these under the protected GitHub Environment named `production`:

- `SUPABASE_ACCESS_TOKEN`: a scoped Supabase personal access token used by the CLI.
- `SUPABASE_PROJECT_ID`: the 20-character production project reference shown in the Supabase dashboard URL.
- `SUPABASE_DB_PASSWORD`: the production Postgres database password.

Do not store these values in repository files, workflow variables, pull-request comments, screenshots, logs, or Vercel public variables.

## Production controls

The workflow:

1. checks out the current tip of `main`;
2. validates the production secrets without printing their values;
3. links only the configured production project;
4. captures the local/remote migration state;
5. executes `supabase db push --linked --dry-run`;
6. applies only pending migrations through `supabase db push --linked`;
7. checks migration history again;
8. records the exact release SHA and redacted project suffix in the GitHub step summary;
9. fails if `main` moved during the deployment window.

Production seeding and remote database reset are deliberately excluded.

## First deployment and existing remote drift

The first run may fail when the production database was created or modified manually and its migration history does not match the repository.

Do not bypass this by automatically using `--include-all`, resetting production, deleting migration files, or marking every local migration as applied.

Instead:

1. preserve a database backup or verified logical dump;
2. inspect `supabase migration list --linked`;
3. identify schema changes already present remotely;
4. reconcile only the confirmed historical entries with `supabase migration repair`;
5. rerun the dry-run;
6. deploy only after the preview contains the intended pending migrations.

Migration-history repair is a production change and requires review by an operator who can compare the live schema with each migration being marked.

## Manual execution

Open **Actions → Supabase Production Migrations → Run workflow** from `main`.

Provide:

- `release_sha`: the full 40-character SHA currently at the tip of `main`;
- `confirmation`: `APPLY_SUPABASE_MIGRATIONS`.

The production environment may require a GitHub approval before secrets are released.

## Validation after deployment

Confirm in Supabase:

- **Database → Migrations** shows the new migration version;
- **Database → Policies** reflects the intended RLS changes;
- application health and readiness endpoints remain healthy;
- an authenticated smoke test succeeds;
- tenant-isolation and Stripe webhook server-side operations still pass when touched by the migration.

For migration `20260725214500_harden_permissions_catalog_rls.sql`, specifically verify:

- RLS enabled on `permissions`;
- RLS enabled on `role_permissions`;
- authenticated read-only catalog access;
- no frontend writes to either RBAC catalog;
- no `anon` or `authenticated` Data API access to `stripe_webhook_events`;
- service-role Stripe webhook idempotency writes continue working.

## Rollback

SQL migrations are forward-only by default. Do not run `supabase db reset --linked` against production.

For a failed rollout:

1. stop application traffic or disable the affected feature when necessary;
2. create and review a compensating migration;
3. apply the compensating migration through the same protected workflow;
4. validate data integrity and RLS behavior;
5. record the incident, exact SHAs, migration versions, and evidence.
