# I-DUP-06 live object evidence

Status: technical review evidence only.

Files in this duplicate-version group:

- `20260623120000_live_rls_validation_inventory.sql`
- `20260623120000_step_up_challenge_store.sql`

## Live RLS inventory helper

Technical disposition candidate: `SUPERSEDED` by `20260730204500_repair_live_rls_validation_inventory.sql`.

The original file creates `public.eurocomply_live_rls_inventory(text[])` and grants service-role execution, but it does not revoke the PostgreSQL default PUBLIC function execution privilege. Current production metadata confirms the resulting drift: the function exists and is security-invoker, but `anon` and `authenticated` still resolve EXECUTE through the current privilege state.

The later repair migration explicitly recreates the same helper, revokes function execution from `public`, `anon`, and `authenticated`, grants it only to `service_role`, and fixes the search path. It is also the migration referenced by the protected Supabase live-RLS proof path.

This evidence does not claim the repair has already been applied to production; the current live privilege result shows that it has not yet reached the expected postcondition.

## Step-up challenge store

Technical disposition candidate: `SUPERSEDED` by the forward-only unique migration `20260813194500_reconcile_step_up_challenges_runtime.sql` in this review branch.

Current production metadata shows `public.step_up_challenges` is absent, while current server code in `src/server/security/step-up-provider.ts` uses that table for challenge creation, loading, replay protection, and consumption.

The new reconciliation migration preserves the runtime data contract while adding the production security boundary missing from the duplicate-version file:

- RLS plus FORCE RLS;
- no table privileges for `public`, `anon`, or `authenticated`;
- service-role-only table access;
- fixed `search_path=pg_catalog` for the update trigger function;
- trigger-function EXECUTE removed from browser roles;
- fail-closed postcondition checks.

Because the new migration has a unique version, future governed deployment does not need to select one file from the historical `20260623120000` collision.

## Boundary

This file records technical evidence only. It does not execute SQL, alter migration history, record an independent approval, or state that a pending migration has been deployed.

- `productionWriteAuthorized = false`
- `migrationExecutionAuthorized = false`
- `independentApprovalPresent = false`
- `canonicalDecisionAccepted = false`
