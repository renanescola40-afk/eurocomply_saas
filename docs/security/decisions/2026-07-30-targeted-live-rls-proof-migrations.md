# ADR — Targeted Supabase Live-RLS Proof Migrations

- **Date:** 2026-07-30
- **Status:** Accepted
- **Decision owner:** Security Engineering / Release Engineering
- **Related:** Issues #198 and #1415

## Context

The live tenant-isolation proof requires a small set of idempotent database helpers and policy repairs. The target Supabase project currently has substantial migration-history drift:

- 17 remote migration versions;
- 169 valid local-only versions;
- 21 legacy invalid filenames/timestamps;
- 16 duplicate local versions.

An unrestricted production `supabase db push` is therefore not an acceptable way to unblock the proof. It would attempt a broad historical backlog whose relationship to the actual live schema has not yet been reconciled.

The repository already has a manually dispatched `Supabase Live RLS Validation` workflow and a protected GitHub environment with an IPv4 pooler connection string. That workflow historically applied a bounded list of proof-specific SQL files through `psql` before running the strict validator.

## Decision

Keep a narrowly scoped, manually dispatched proof-migration path while the broader migration history is reconciled under issue #1415.

The proof workflow may apply only the SQL files explicitly listed in `.github/workflows/supabase-live-rls-validation.yml` when all of the following are true:

1. The workflow is manually dispatched from the exact current `main` SHA.
2. `apply_migrations=true` is supplied deliberately.
3. The protected `supabase-live-rls-validation` environment supplies `SUPABASE_DB_URL`.
4. The URL uses the IPv4-capable pooler rather than the direct IPv6-only endpoint.
5. Focused migration and evidence contracts pass before database access.
6. Every file is executed with `ON_ERROR_STOP` and a single transaction.
7. The repaired inventory helper is used instead of the older permissive helper migration.
8. Effective live privileges are checked after application:
   - no `PUBLIC` execute grant;
   - no `anon` execute grant;
   - no `authenticated` execute grant;
   - `service_role` retains execute;
   - the function remains `SECURITY INVOKER`;
   - the function has a fixed `search_path`.
9. The strict tenant-isolation validator runs immediately afterward.
10. Evidence remains bound to the exact final SHA and GitHub Actions provenance.

## Security boundary

The inventory helper exposes schema-security metadata and is not an application feature. It must remain accessible only to the controlled service-role proof runner.

The repair migration therefore:

- recreates the exact required signature idempotently;
- fixes `search_path` to `public, pg_catalog`;
- explicitly revokes default/public execution;
- revokes `anon` and `authenticated` execution;
- grants only `service_role` execution;
- reloads the PostgREST schema cache.

## Migration-history boundary

This targeted path executes SQL directly and does **not** claim to reconcile `supabase_migrations.schema_migrations`.

It must not be used to:

- deploy arbitrary product migrations;
- mark historical migrations as applied;
- justify a general production `db push`;
- close issue #1415;
- represent the production schema as fully aligned.

The migration-history backlog requires schema-level classification, dry-run, staged testing, independent approval, and post-execution drift evidence.

## Consequences

### Positive

- Issue #198 can be unblocked without attempting 169 unrelated local migrations.
- The proof helper receives stronger privilege controls than the original migration.
- The workflow validates the effective database state, not only repository text.
- The existing protected environment and exact-SHA controls are reused.

### Trade-offs

- The targeted SQL execution is an explicit temporary exception while migration history is unresolved.
- The migration-history table remains incomplete until issue #1415 is resolved.
- A human must still merge this change, dispatch the workflow, and review genuine runtime evidence.

## Exit criteria

This exception can be retired when:

- issue #1415 is completed;
- normal production migration deployment is reconciled and independently approved;
- the live proof no longer needs direct allowlisted SQL application;
- strict exact-SHA runtime evidence remains passing through the standard deployment path.
