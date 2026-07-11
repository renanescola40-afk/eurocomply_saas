# Database Performance and RLS Review

Review date: 2026-07-11  
Database: Supabase Postgres

## Executive assessment

The repository contains mature RLS, tenant-isolation and index review controls. Live evidence shows a previous commit passed cross-tenant read/write/delete tests across critical tables. That evidence is valuable engineering history but is not release proof for the current commit because it is bound to an older SHA.

Enterprise production remains No-Go until live RLS and database evidence is regenerated for the exact promoted commit and the backup/restore objectives are exercised.

## Tenant isolation model

Tenant-scoped rows use `organization_id`. Access requires all of the following:

1. verified Supabase user;
2. active organization membership;
3. server-side permission for the requested action;
4. organization-scoped query/RPC;
5. RLS policy enforcement.

The service-role key must remain server-only and must not be used to bypass authorization decisions derived from user-controlled organization ids.

## Tables covered by existing live evidence

The live RLS evidence records coverage for organizations, organization members, AI systems, compliance tasks, documents, risks, vendors, subscriptions, audit logs, invitations, onboarding activation runs, monitoring preferences, profiles and AI assessments, with regulatory updates treated as a global reference table.

The acceptance invariant is operation-specific:

- cross-tenant select denied;
- cross-tenant insert denied;
- cross-tenant update denied;
- cross-tenant delete denied;
- same-tenant authorized action allowed;
- viewer/admin/owner behavior matches policy;
- backend-owned/global reference tables are not client-writable.

## Evidence freshness gap

`docs/security/evidence/runtime/supabase-live-rls-validation.json` is `Complete/passed`, but it references commit `6a2fa4aa9775df3d5cdd0d972b6ffaed5769731f`, not the reviewed `main` commit. The enterprise release validator must reject this as stale/unbound evidence.

Required rerun:

```bash
npm run security:rls:live
npm run release:enterprise-runtime-evidence
```

The output must identify the promoted full commit SHA, target project by redacted fingerprint, GitHub Actions run and current timestamp.

## Index review

Tenant-heavy tables should have leading or composite indexes that match actual filters and ordering. At minimum review:

- `organization_id` on every tenant table;
- `user_id`/membership identity fields;
- foreign-key columns;
- `created_at` for time-ordered lists and retention jobs;
- `status` when used in operational queues;
- `(organization_id, created_at desc)` for tenant activity feeds;
- `(organization_id, status, created_at)` for tasks, risks, documents and workflow queues;
- unique membership/invitation constraints scoped to organization;
- Stripe event/idempotency keys;
- audit-chain sequence/hash lookup fields;
- storage/document lookup keys.

Existing migration `20260629110000_enterprise_tenant_rls_cleanup_indexes.sql` indicates targeted cleanup/index work. Before release, compare migration intent with production catalog state; a migration file alone is not evidence that the index exists or is used.

## Query performance review

### Required checks

- Capture `EXPLAIN (ANALYZE, BUFFERS)` in staging for slow tenant list/detail queries using synthetic data.
- Verify no sequential scan on large tenant tables for common organization filters.
- Verify pagination is bounded and deterministic.
- Avoid selecting full document bodies/large JSON for list pages.
- Batch related counts rather than issuing per-row queries.
- Use explicit column lists and server-side projections.
- Confirm connection pool mode and transaction compatibility for Vercel/serverless execution.
- Track database statement timeout and API timeout separately.

### N+1 risk areas

Highest-risk surfaces are dashboard scorecards, organization member/role resolution, document/risk/vendor lists with per-row metadata, audit log enrichment and billing/subscription context. These areas should use joined/batched queries or precomputed aggregates where practical.

No claim is made that all N+1 patterns are eliminated without runtime query traces and representative data.

## Performance budgets

Initial enterprise targets for staging validation:

| Operation | Target |
| --- | --- |
| Membership/permission resolution | p95 <= 100 ms database time |
| Tenant list APIs | p95 <= 300 ms, p99 <= 700 ms |
| Dashboard aggregate query set | p95 <= 800 ms database time |
| Mutation transaction | p95 <= 500 ms excluding external provider latency |
| Audit append | p95 <= 150 ms and no dropped critical events |

Targets must be adjusted from measured production-like baselines. They are objectives, not current evidence.

## Migration safety

Every production migration must have:

- owner and change ticket/PR;
- forward SQL reviewed for lock duration and table rewrite risk;
- compatibility with the currently deployed application and the previous known-good version;
- explicit rollback or roll-forward plan;
- pre-migration backup/snapshot reference where supported;
- bounded maintenance window for high-lock changes;
- verification queries;
- RLS/index regression tests;
- post-deploy smoke and query-latency review.

Avoid destructive rename/drop operations in the same release that removes application compatibility. Prefer expand -> backfill -> dual-read/write where necessary -> contract.

## Backup, restore, RPO and RTO

Managed backups are not sufficient evidence by themselves. Enterprise readiness requires an executed restore drill.

Proposed objectives pending measured proof:

- RPO objective: <= 24 hours for standard plan; tighter objectives only if provider configuration and contract support them.
- RTO objective: <= 8 hours for a full database restore and application validation.
- Security incident restore: restore must not reintroduce revoked credentials, unsafe uploads or vulnerable application configuration.

Restore drill evidence must record:

1. source backup timestamp and redacted project reference;
2. target isolated restore environment;
3. restore start/end times;
4. schema/migration consistency;
5. row-count and integrity checks;
6. auth/RLS tenant A/B validation;
7. audit-chain validation;
8. application smoke against restored data;
9. measured RPO/RTO;
10. cleanup of the restore environment.

Until this drill is complete, do not claim a tested disaster-recovery capability or contractual RPO/RTO.

## Release blockers

- Current-commit live RLS evidence is missing.
- Production catalog/index usage evidence is not attached.
- Representative query traces and N+1 measurements are incomplete.
- Restore drill and measured RPO/RTO are incomplete.
- Migration rollback has not been proven against the exact release candidate.

## Required commands and evidence

```bash
npm run security:rls:live
npm run security:authorization-bola
npm run security:audit-chain:live
npm run release:rollback:dry-run
node scripts/performance/run-http-load-smoke.mjs
```

Store redacted runtime output under `docs/security/evidence/runtime/` and keep private database URLs, tokens, query parameters containing customer data and raw production rows out of the repository.
