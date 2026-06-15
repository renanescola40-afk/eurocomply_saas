# Phase 3 Database Migration Safety Guide

This guide defines the safe database migration method for EuroComply SaaS production readiness.

## Scope

This document covers review, ordering, execution, verification, and rollback caution for Supabase/Postgres migrations.

It does not authorize product template, document template, email template, or UI template edits.

## Migration source of truth

Migration files must live under:

```text
supabase/migrations/
```

Run migrations in filename order. Do not skip files unless a written release note explains why.

## Pre-migration checklist

Before applying migrations to production:

1. Confirm each migration was reviewed.
2. Confirm every destructive statement is intentional and documented.
3. Confirm RLS policies continue to deny cross-tenant access.
4. Confirm service-role operations remain server-only.
5. Confirm indexes exist for new query patterns that can affect production latency.
6. Confirm a backup or provider recovery point exists before risky migrations.
7. Confirm the deployment can be rolled back without requiring a destructive database rollback.

## Prohibited migration patterns

Do not run production migrations that include these patterns without explicit written approval:

- Dropping customer tables.
- Dropping customer data columns.
- Truncating production tables.
- Disabling RLS.
- Broadening tenant filters.
- Moving secrets into public tables.
- Granting anonymous users write access to protected data.
- Running unbounded data backfills during peak traffic.

## Preferred migration method

Use expand-and-contract for risky changes:

1. Add nullable columns or new tables first.
2. Deploy code that writes both old and new structures when needed.
3. Backfill in controlled batches.
4. Verify reads against the new structure.
5. Remove old columns only in a later phase/release after monitoring.

## Execution method

1. Apply migrations in filename order.
2. Keep a copy of the executed SQL or provider migration log.
3. Record start and finish time.
4. Record the operator or automation identity.
5. Record any warnings or manual SQL commands.

## Post-migration verification

After migrations:

1. Confirm application boot succeeds.
2. Confirm authentication still works.
3. Confirm tenant isolation still works.
4. Confirm billing and webhook tables are readable/writable only by expected server flows.
5. Confirm audit/evidence tables preserve existing records.
6. Confirm no public client can access service-role-only data.

## Rollback caution

Database rollback is not the same as application rollback.

Prefer forward fixes unless the migration is proven safe to reverse. Never run destructive rollback SQL without preserving evidence, confirming backup status, and recording the recovery decision.

## Phase 3 completion note

Phase 3 requires this guide to exist and be referenced by the production readiness checker before production readiness can be marked complete.
