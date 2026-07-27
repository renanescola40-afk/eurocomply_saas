# Supabase production RLS drift reconciliation

## Purpose

This procedure closes the immediate production security gap caused by legacy migration-history drift without running historical migrations with `--include-all`, resetting the database, or marking unverified migrations as applied.

## Scope

The guarded workflow applies one idempotent SQL package that:

- enables and forces RLS on `public.permissions`;
- enables and forces RLS on `public.role_permissions`;
- keeps `public.stripe_webhook_events` forced-RLS and backend-only;
- grants authenticated read-only access to the RBAC catalog tables;
- revokes anonymous access and all browser-role access to Stripe webhook idempotency records;
- records migration evidence as version `20260726070000`.

It does not reconcile the entire legacy migration history.

## Required GitHub environment secrets

Configure these under the protected `production` environment:

- `SUPABASE_PROJECT_ID`;
- `SUPABASE_DB_POOLER_URL`.

`SUPABASE_DB_POOLER_URL` must be the PostgreSQL **Session Pooler** connection string copied from Supabase **Connect → Session pooler**. The username normally contains the project reference, and SSL must remain enabled. Use the pooler because GitHub-hosted runners may not have an IPv6 route to the direct `db.<project-ref>.supabase.co:5432` endpoint.

Never place the connection string, password, secret values or unredacted host credentials in issues, pull requests, logs or screenshots.

## Execution

After the workflow fix is merged:

1. Open **Actions → Supabase Production RLS Reconciliation**.
2. Select **Run workflow** from `main`.
3. Enter the current full 40-character SHA at the tip of `main`.
4. Enter `APPLY_RLS_RECONCILIATION` exactly.
5. Run the workflow and wait for the verification step.

Do not use **Re-run jobs** for a previous failed execution when the `main` SHA or workflow implementation changed. Start a new dispatch.

## Expected proof

The job summary must show:

```text
rls|permissions|t|t
rls|role_permissions|t|t
rls|stripe_webhook_events|t|t
policy|permissions|permissions_authenticated_read|SELECT|authenticated
policy|role_permissions|role_permissions_authenticated_read|SELECT|authenticated
history|20260726070000|permissions_catalog_rls_hotfix
```

There must be no policy row for `stripe_webhook_events`.

## Rollback

If the application unexpectedly depends on anonymous access to either catalog table, revert only the grants and policies after confirming the dependency. Do not disable RLS on `stripe_webhook_events`.

## Legacy drift boundary

The normal production migration workflow must remain fail-closed while local and remote histories disagree. A separate audited baseline project is required before broad historical repair. This hotfix intentionally avoids claiming that the full migration history is reconciled.
