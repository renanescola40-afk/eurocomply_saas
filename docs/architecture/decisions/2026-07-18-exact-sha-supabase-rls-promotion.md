# Exact-SHA Supabase RLS evidence promotion

Date: 2026-07-18
Status: Accepted

## Context

The repository already contains a strict live Supabase tenant-isolation validator. It creates synthetic users and organizations, inventories deployed RLS policies, executes authenticated same-tenant and cross-tenant operations, verifies denied writes did not mutate protected rows, and cleans up its fixtures.

The previous workflow wrote the generated JSON to a dedicated Git branch and opened an evidence pull request. That model allowed runtime evidence to become stale, required write permissions, and did not give the Enterprise Readiness Scorecard a reliable exact-SHA artifact source. Consequently TEN-02 through TEN-06 remained `NOT_VERIFIED` even when the live validator existed.

## Decision

1. Run the Supabase live RLS proof on every `main` push and allow a manual exact-main-SHA dispatch.
2. Keep the existing protected `supabase-live-rls-validation` environment and its secrets.
3. Use read-only repository permissions and upload runtime evidence as a retained GitHub Actions artifact rather than committing it.
4. Permit database migrations only during an explicit manual dispatch with `apply_migrations=true`; automatic push runs validate the deployed schema without mutating it.
5. Require the checked-out SHA, triggering SHA, and current remote `main` SHA to match.
6. Fetch only a successful, non-expired artifact from the canonical workflow, branch, repository, run ID, and exact SHA.
7. Re-derive a canonical `supabase-rls-validation.json` inside the scorecard run.
8. Promote only the five operations directly proven by the live test:
   - organization membership isolation;
   - cross-tenant reads denied;
   - cross-tenant inserts denied;
   - cross-tenant updates denied;
   - cross-tenant deletes denied.

## Evidence boundary

This proof uses synthetic fixtures against the configured Supabase project. It does not prove organization onboarding, administrative-client boundaries, export isolation, audit-chain isolation, storage isolation, backup restoration, every future table, or a third-party penetration test. Those controls retain independent evidence requirements.

No credential, session token, user identifier, organization identifier, raw project reference, connection string, or provider response is persisted in the canonical artifact. The Supabase project reference remains hashed/redacted.

## Failure behavior

Missing secrets, environment rejection, a stale SHA, schema drift, missing tables, failed RLS assertions, incomplete cleanup, invalid provenance, expired artifacts, or any evidence mismatch prevents promotion. The scorecard removes stale canonical evidence and leaves TEN-02 through TEN-06 `NOT_VERIFIED`.

## Consequences

The protected workflow may reduce availability of evidence generation when Supabase or GitHub Actions is unavailable, but it does not affect application runtime. Runtime evidence is no longer reviewed through a normal source-code pull request; instead, its trust derives from the protected environment, immutable workflow run, exact-SHA artifact, redaction contract, and scorecard-side validation.

## Rollback

Revert the workflow, fetcher, canonical evidence writer, validators, tests, and this ADR together. After rollback, remove any canonical RLS evidence produced by the reverted pipeline and return the mapped controls to `NOT_VERIFIED` unless another accepted exact-SHA proof exists.
