# Isolated Enterprise and FRIA Database Proof

## Purpose

Validate the integrated migration chain for Enterprise tenant licensing and the Article 27 FRIA workflow without connecting to production or retaining customer data.

## What the workflow proves

- the exact current `main` SHA is checked out;
- a disposable local Supabase stack starts successfully;
- the complete migration chain applies from zero;
- critical Enterprise and FRIA tables exist;
- row-level security and forced RLS are enabled on the protected tables;
- critical database functions use a fixed `search_path`;
- at least one serialized seat authority uses row locking or a transaction advisory lock;
- critical functions remain organization-scoped;
- `anon` and `authenticated` do not retain direct mutation grants on the protected tables;
- the retained report contains no database URL, credentials, customer data or raw records.

## Automatic execution

The workflow runs after `Full Security Suite` succeeds on the current `main` SHA.

## Manual execution

Use `workflow_dispatch` only for the current full `main` SHA and type:

`RUN_ISOLATED_ENTERPRISE_FRIA_DB_PROOF`

The run fails closed if the supplied SHA is stale or is not the exact current `main` commit.

## Evidence artifact

`isolated-enterprise-fria-db-proof-<sha>`

The artifact is retained for 90 days and contains only the sanitized JSON proof.

## Failure handling

1. inspect the `failures` array in the retained proof;
2. reproduce with the same exact SHA locally;
3. fix the migration, RLS, grant or function-hardening defect;
4. rerun the full repository security gates;
5. rerun this proof on the new integrated SHA.

Do not bypass a failed migration, disable RLS for the test, edit the retained report or count a partially applied database as evidence.

## Truth boundary

This workflow proves isolated migration and database-authority properties. It does not prove:

- production migration completion;
- 1,000–10,000-user throughput;
- real SAML or SCIM provider conformance;
- Stripe test-mode behavior;
- production rollback;
- legal methodology review;
- external penetration testing;
- regulator acceptance;
- full Enterprise readiness or `GO`.
