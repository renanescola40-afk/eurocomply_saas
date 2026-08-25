# Isolated Enterprise and FRIA Database Proof

## Purpose

Validate the reviewed disposable schema effects required by Enterprise tenant licensing and the Article 27 FRIA workflow without connecting to production, rewriting historical migration identities, or retaining customer data.

## What the workflow proves

- the exact current `main` SHA is checked out;
- a disposable local Supabase database starts successfully through the canonical reviewed schema boundary;
- reviewed schema effects are reconstructed under the repository's existing duplicate/invalid/unapplied migration compatibility decisions;
- `RECOVERY_EPHEMERAL_MIGRATION_HISTORY_CANONICAL=false` is mandatory, so a green run cannot be credited as migration-history reconciliation or Production migration completion;
- critical Enterprise and FRIA tables exist;
- row-level security and forced RLS are enabled on the protected tables;
- critical database functions use a fixed `search_path`;
- at least one serialized seat authority uses row locking or a transaction advisory lock;
- critical functions remain organization-scoped;
- `anon` and `authenticated` do not retain direct mutation grants on the protected tables;
- the retained report contains no database URL, credentials, customer data or raw records.

The workflow deliberately uses `scripts/recovery/run-reviewed-ephemeral-schema-boundary-v4.mjs`. It must not call a raw `supabase db reset` against the unreviewed repository migration directory because the repository retains historical duplicate/invalid migration identities whose bytes and Production lineage are governed separately.

## Automatic execution

The workflow runs after `Full Security Suite` succeeds on the current `main` SHA.

## Manual execution

Use `workflow_dispatch` only for the current full `main` SHA and type:

`RUN_ISOLATED_ENTERPRISE_FRIA_DB_PROOF`

The run fails closed if the supplied SHA is stale or is not the exact current `main` commit.

## Evidence artifact

`isolated-enterprise-fria-db-proof-<sha>`

The artifact is retained for 90 days and contains only the sanitized JSON proof. The report records `schemaEffectsReplayed=true` and `migrationHistoryCanonical=false`.

## Failure handling

1. determine whether the failure is in the reviewed disposable schema boundary or in the Enterprise/FRIA database assertions;
2. reproduce against the same exact SHA using the reviewed schema boundary, never by editing or resequencing historical migration files;
3. fix the schema-effect compatibility, RLS, grant or function-hardening defect through the governed forward path;
4. rerun the full repository security gates;
5. rerun this proof on the new integrated SHA.

Do not bypass a failed reviewed boundary, disable RLS for the test, rewrite historical migration bytes, edit the retained report or count a partially reconstructed database as Production evidence.

## Truth boundary

This workflow proves isolated reviewed schema-effect and database-authority properties. It does not prove:

- canonical migration-history reconciliation;
- Production migration completion;
- 1,000–10,000-user throughput;
- real SAML or SCIM provider conformance;
- Stripe test-mode or LIVE lifecycle behavior;
- Production rollback;
- legal methodology review;
- external penetration testing;
- regulator acceptance;
- full Enterprise readiness or `GO`.
