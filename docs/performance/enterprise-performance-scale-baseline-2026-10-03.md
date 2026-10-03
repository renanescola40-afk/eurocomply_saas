# RISCK COMPLY — Enterprise Performance + Scale Baseline

Date: 2026-10-03
Mode: Lane A / read-only production analysis
Production mutation: NONE
Main mutation: NONE
MAASEC target mutation: NONE
Baseline main SHA: `1411d8f4ac861ab32bb61ca55648cfcc5af8f15a`
Production Vercel SHA observed: `1411d8f4ac861ab32bb61ca55648cfcc5af8f15a`

## Supabase baseline

- Project: `tganhbbhfxcpblmgqprg`
- Region: `eu-west-1`
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: `17.6`
- Database size: `26,848,403 bytes` (~25.6 MiB)
- `max_connections`: `60`
- Connections observed during baseline: `12`
- Cache hit ratio: `100.00%`
- Waiting locks: `0`
- `pg_stat_statements`: enabled
- Statistics reset timestamp: `2026-05-22 15:13:20+00`

## Supabase performance advisor reconciliation

Observed at 2026-10-03:

- Unindexed foreign keys: `89` (INFO)
- Unused indexes: `92` (INFO)
- Auth DB connection strategy: absolute allocation, max `10` Auth DB connections (INFO)

These are advisory findings, not proof of production performance failure.

## Foreign-key review

Public schema:

- Total foreign keys: `250`
- With leading covering index: `161`
- Without leading covering index: `89`

Preliminary evidence-based classification using current row estimates, table scan activity and write counters:

- `P1_INDEX_REQUIRED`: `0`
- `P2_INDEX_RECOMMENDED`: `65`
- `P3_LOW_VALUE`: `21`
- `NO_INDEX_REQUIRED`: `3`

This classification is preliminary. No index is authorized for production creation until isolated benchmark evidence demonstrates a material benefit and MAASEC freeze is removed.

## Notable table/activity observations

The database is currently small. Several high scan counters are accumulated over a long statistics window and must not be interpreted as present-day latency by themselves.

Examples:

- `enterprise_contracts`: ~264 rows, ~576 KiB total relation footprint.
- `organizations`: ~265 rows, ~416 KiB total.
- `organization_members`: ~206 rows, ~392 KiB total.
- `audit_events`: ~180 rows with very high accumulated scan counters, requiring workload/query-path interpretation rather than blind index creation.
- `ai_systems`: ~6 rows with high sequential scan count relative to its current size; sequential access can still be cheaper than index access at this size.

## Query-statistics observations

`pg_stat_statements` is available. The highest cumulative entries include substantial Supabase/PostgREST/platform introspection and request-context setup traffic. Therefore total execution time must be separated into application-critical workload classes before optimization decisions are made.

A small current database plus accumulated scan counters means advisor findings alone are insufficient justification for DDL.

## Auth connection strategy

Current advisor finding: Auth is configured with an absolute ceiling of `10` database connections. PostgreSQL `max_connections` is `60`; 12 total DB connections were observed during baseline capture.

No Auth configuration change is permitted during MAASEC freeze. Post-pentest recommendation must be selected from Supabase-supported percentage-based allocation only after concurrency/load testing establishes expected Auth demand and connection headroom.

## Lane A status

Completed:

1. Production identity and PostgreSQL version baseline.
2. Database size baseline.
3. Connection, cache-hit and waiting-lock baseline.
4. `pg_stat_statements` availability confirmed and initial hotspot capture performed.
5. Exact 89 unindexed-FK advisor finding reconciled against catalog state.
6. Exact 92 unused-index advisor count captured.
7. Exact Auth connection-strategy advisor finding captured.
8. All 89 FK findings received a preliminary evidence-based classification.
9. Main SHA and production Vercel SHA were reconciled at `1411d8f4ac861ab32bb61ca55648cfcc5af8f15a` during this baseline.

Still required before PERFORMANCE_SCALE=100%:

1. Row-level classification of all 92 advisor-reported unused indexes into KEEP / REVIEW_LATER / SAFE_DROP_CANDIDATE.
2. Application workload mapping against critical customer journeys.
3. Isolated/disposable benchmark of candidate FK indexes with EXPLAIN ANALYZE / BUFFERS.
4. Isolated load tests and P50/P95/P99 collection at staged concurrency.
5. Connection-headroom validation under load, including Auth.
6. Exact post-pentest DDL/configuration changeset plus rollback and validation SQL.
7. After freeze removal and explicit authorization: production change execution and revalidation.

## Safety statement

No production DDL, index creation/removal, RLS change, Auth setting change, application-code change, main merge or production deployment was performed by this performance/scale closure lane.
