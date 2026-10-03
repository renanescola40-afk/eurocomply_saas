# RISCK COMPLY — Isolated Performance Lab Runbook

Date: 2026-10-03
Mode: Lane A / disposable Supabase branch only
Production mutation: FORBIDDEN
Main mutation: FORBIDDEN
MAASEC target mutation: FORBIDDEN

## Disposable lab

- Branch name: `perf-scale-closure-20261003`
- Branch project ref: `ulhppiqgymekvmxmegeq`
- Parent production project: `tganhbbhfxcpblmgqprg`
- Billing confirmed by owner: USD 0.01344/hour
- Branch contains no production data by design.

## Hard promotion gate before benchmark

No benchmark result may be treated as representative until migration parity is proven.

Production baseline observed:

- migration_count: `113`
- first migration: `20260605190000`
- last migration: `20261003173930`

At initial branch provisioning the lab showed only 26 migrations through `20260812224650`, so the branch was not yet valid for workload benchmarking. A rebase was initiated against production migrations. Benchmark execution remains blocked until the lab reaches exact migration parity with production.

Required PASS condition:

- lab migration_count = production migration_count
- lab max(version) = production max(version)
- required public tables/functions exist
- branch status is healthy and no migration failure remains

## Synthetic data policy

Use only synthetic test data in the disposable branch. Do not copy customer or production rows.

Synthetic scale stages for selected tenant-scoped tables:

1. Baseline schema only
2. 1k rows per principal workload relation where valid
3. 10k rows
4. 100k rows where schema and cost permit

Synthetic tenants must be isolated and deterministic so query plans can be compared before/after candidate indexes.

## Candidate index benchmark rules

For each FK/index candidate:

1. Capture baseline `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`.
2. Record planning time, execution time, scan type, rows removed, shared hits/reads, sort method, temp I/O.
3. Create candidate index only in the disposable branch.
4. `ANALYZE` the affected relation in the disposable branch.
5. Repeat the exact query.
6. Compare execution time and buffer work.
7. Measure index size and write-path overhead.
8. Classify candidate as `PROMOTE`, `DEFER`, or `REJECT`.

No production index is authorized by this runbook.

## Critical workload matrix

Benchmark at minimum:

- organization membership resolution
- login/auth-supporting membership lookup
- dashboard organization summary
- AI system list/detail
- assessment list/detail
- document list/search/download metadata
- risk list/detail
- compliance tasks
- vendors
- audit events and audit logs
- monitoring/regulatory updates
- billing/subscription/entitlement lookup
- enterprise contract lookup
- API keys / SCIM / webhook worker queue paths

## Load stages

Run only against the disposable environment:

- 10 concurrent users
- 25 concurrent users
- 50 concurrent users
- 100 concurrent users
- 250 concurrent users
- 500 concurrent users
- 1000 concurrent users only if earlier stages remain healthy and resource/cost conditions allow

For each stage capture:

- request count
- throughput
- P50
- P95
- P99
- application error rate
- database connection count
- waiting locks
- cache-hit ratio
- slow query distribution
- CPU/memory indicators when available
- Auth failures/timeouts

## Provisional enterprise acceptance targets

These are test gates, not currently claimed production guarantees.

- Health/simple reads: P95 <= 300 ms where network-independent measurement is available
- Standard authenticated application reads: P95 <= 750 ms
- Standard writes: P95 <= 1000 ms
- Long-running/document-generation workflows are measured separately
- Error rate under sustained non-destructive test load: < 1%
- No sustained connection exhaustion
- No unexplained lock queue growth
- No cross-tenant or RLS regression

## Auth scale gate

Production advisor currently reports an absolute Auth database allocation of 10 connections while PostgreSQL max_connections is 60.

No production Auth configuration change is allowed during the MAASEC freeze.

Post-pentest promotion requires:

1. measure Auth/login concurrency in isolated test conditions;
2. establish DB connection headroom;
3. select a Supabase-supported percentage-based Auth connection allocation only if evidence demonstrates benefit;
4. rollback plan documented before production configuration change.

## Unused-index interpretation

The Supabase advisor count changed from 92 to 91 after a read-only workload used `risks_org_created_at_idx`. No schema change occurred. Therefore advisor `unused_index` is workload-sensitive and must not be interpreted as a static list of indexes that should be dropped.

No index removal is authorized solely because `idx_scan = 0`.

## Production promotion gate

After MAASEC freeze removal and explicit owner authorization only:

1. reconcile main SHA and production SHA;
2. apply only benchmark-approved changes;
3. use safe/concurrent index strategy where applicable;
4. observe locks and customer-impact indicators;
5. rerun critical workload probes;
6. rerun Supabase performance advisor;
7. validate RLS/tenant isolation;
8. validate billing/Auth/customer journeys;
9. record rollback evidence;
10. declare `PERFORMANCE_SCALE=100%` only after production revalidation passes.
