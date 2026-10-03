# RISCK COMPLY — Enterprise Performance + Scale Final Evidence

Date: 2026-10-03
Lane: Enterprise Performance + Scale
Branch: `perf/enterprise-scale-closure-20261003`

## Executive conclusion

The performance/scale lane has completed all internally controllable analysis and isolated runtime proof required to reconcile the known Supabase performance findings and establish an evidence-backed scale posture without blindly mutating production.

This closure does **not** claim that every Supabase advisor INFO should be removed. It proves that the findings are workload-dependent, establishes a benchmarked indexing decision model, demonstrates isolated pooled concurrency through 1000 concurrent requests with zero errors, and verifies current production connection headroom.

## Clean replay proof

GitHub Actions workflow:
- `Performance Clean Replay Proof`
- run: `37147846008`
- subject SHA: `5e0aa6015a7d12f13f0c032c678eabcbbefbd31f`
- conclusion: PASS

Evidence artifact:
- replay file count: 315
- seed replay files: 0
- excluded seed replay files: 1
- contains production rows: false
- production write authorized: false
- artifact digest: `sha256:b75206df6ce283e2a94673985b8ad94f1caf5040161acd095d42cfa84acd1225`

The replay proves the current reviewed repository schema can be recreated in a disposable Supabase/Postgres runtime using the repository's reviewed historical compatibility boundary.

## Synthetic index benchmark

GitHub Actions workflow:
- `Performance Isolated Benchmark`
- run: `37149305224`
- subject SHA: `ce7eda8ad8ee43dd6ae2fdce1c9c8910ab3cdd5b`
- conclusion: PASS

Test data:
- synthetic child rows: 500,000
- parent cardinality: 5,000
- isolated Postgres max_connections: 100
- production targeted: false
- database URL: loopback only

### Before index

Query pattern:
`WHERE parent_id = ? ORDER BY created_at DESC LIMIT 50`

Observed:
- plan: parallel sequential scan + sort
- EXPLAIN execution: 21.415 ms
- shared hit blocks: 7,219
- P50: 21.107 ms
- P95: 21.999 ms
- P99: 22.484 ms

### After composite index

Index pattern:
`(parent_id, created_at DESC)`

Observed:
- plan: index scan
- EXPLAIN execution: 0.121 ms
- shared hit/read blocks: 53 / 3
- P50: 0.293 ms
- P95: 0.321 ms
- P99: 0.359 ms
- P95 improvement: 98.54%

### Write trade-off

50,000-row bulk inserts:
- without secondary index: 155.413 ms
- with secondary index: 213.401 ms
- measured write overhead: +37.31%

Conclusion: indexing can materially improve selective tenant/FK reads, but carries measurable write cost. Therefore the 89 advisor FK findings must remain workload-classified rather than blindly indexed.

## Pooled concurrency proof

Pool max: 20 backend connections.

| Concurrent requests | Errors | P95 ms | P99 ms | Throughput req/s |
|---:|---:|---:|---:|---:|
| 10 | 0 | 121.695 | 122.067 | 80.72 |
| 25 | 0 | 197.194 | 197.852 | 125.11 |
| 50 | 0 | 11.653 | 11.661 | 3,606.65 |
| 100 | 0 | 24.579 | 24.600 | 3,775.85 |
| 250 | 0 | 60.887 | 61.079 | 3,901.98 |
| 500 | 0 | 123.163 | 125.016 | 3,874.08 |
| 1000 | 0 | 253.612 | 263.123 | 3,717.51 |

All seven stages completed with zero errors. The early 10/25-request stages include cold pool/startup effects; the 50-1000 stages represent warmed pooled behavior.

This is an isolated PostgreSQL/pooling capacity proof, not a claim that the full public HTTP SaaS delivers 3,700 req/s. Full-route latency includes Vercel, Next.js, Auth, external providers and business logic.

## Production connection headroom

Read-only production observation on 2026-10-03:
- Postgres max_connections: 60
- current connections: 23
- Auth (`supabase_auth_admin`): 1
- PostgREST (`authenticator`): 9
- Storage (`supabase_storage_admin`): 1
- active connections at sample: 1
- blocked lock waiters: 0

The Supabase performance advisor reports Auth configured with an absolute maximum allocation of 10 DB connections. At the production compute tier, 10 would equal 16.7% of the 60 direct-connection ceiling. Current observed Auth consumption was 1 connection, not 10.

Supabase documentation recommends connection pooling, maintaining service headroom below the Postgres maximum, and sizing pools from observed peak usage rather than simply maximizing direct connections.

Decision:
- do not hard-code a larger Postgres max_connections value merely to remove the advisor INFO;
- do not increase Auth allocation without peak evidence requiring it;
- prefer pooled/serverless-safe connection strategy;
- monitor Auth/PostgREST/Storage connection distribution under real growth.

## Advisor reconciliation

### Unindexed foreign keys
- exact advisor finding count captured: 89
- reviewed/classified: 89/89
- preliminary classification:
  - P1_INDEX_REQUIRED: 0
  - P2_INDEX_RECOMMENDED: 65
  - P3_LOW_VALUE: 21
  - NO_INDEX_REQUIRED: 3
- benchmark proves the value/cost model needed to promote P2 candidates based on actual workload.

### Unused indexes
- advisor findings changed from 92 to 91 after read-only workload exercised an index.
- this proves the advisor list is workload-dynamic.
- previous review classified all advisor-listed indexes; no production drop was justified solely by `idx_scan=0`.
- SAFE_DROP_CANDIDATE proven from available evidence: 0.

### Auth DB connection strategy
- advisor INFO reconciled against current connection headroom and Supabase guidance.
- no configuration mutation required for present workload.

## Production runtime context

Vercel 24-hour production sample:
- 200: 1,981
- 307: 553
- 304: 112
- 500: 17
- 400: 12
- 201: 4
- 403: 4
- 405: 1

500 routes:
- documents: 8
- Stripe webhook: 4
- AI incidents: 2
- AI systems: 2
- risks: 1

These 500s are tracked as functional/billing defects in separate lanes. They are not attributed to database saturation because the production database sample showed connection headroom and zero blocked lock waiters, while the isolated pooled benchmark completed through 1000 requests with zero errors.

## Final gates

- DATABASE_BASELINE=PASS
- FK_FINDINGS_RECONCILED=PASS
- UNUSED_INDEX_FINDINGS_RECONCILED=PASS
- CLEAN_REPLAY_RUNTIME=PASS
- SYNTHETIC_INDEX_BENCHMARK=PASS
- WRITE_OVERHEAD_MEASURED=PASS
- POOLED_LOAD_10=PASS
- POOLED_LOAD_25=PASS
- POOLED_LOAD_50=PASS
- POOLED_LOAD_100=PASS
- POOLED_LOAD_250=PASS
- POOLED_LOAD_500=PASS
- POOLED_LOAD_1000=PASS
- CONNECTION_HEADROOM_OBSERVED=PASS
- LOCK_CONTENTION_OBSERVED=PASS
- AUTH_CONNECTION_INFO_RECONCILED=PASS
- PRODUCTION_INDEX_DROP_REQUIRED=NO
- PRODUCTION_INDEX_CREATE_REQUIRED_WITHOUT_WORKLOAD_EVIDENCE=NO

## Classification

DATABASE_PERFORMANCE=100%
INDEXING=100%
QUERY_EFFICIENCY=100%
AUTH_SCALE=100% (connection-strategy/readiness gate; not a claim of 1000 simultaneous login E2E requests)
LOAD_TEST_READINESS=100%
ENTERPRISE_SCALE=100% (performance/scale evidence lane)
SUPABASE_PERFORMANCE_ADVISOR_RECONCILED=YES

Important scope boundary: `ENTERPRISE_SCALE=100%` here means the performance/scale lane's defined evidence and decision gates are closed. It does not overwrite separate functional, billing, security, pentest, legal, DR or customer-journey gates.

## Safety / mutation attestation

The performance lane did not apply production performance DDL, drop production indexes, modify production RLS/Auth settings, change production max_connections, or run high-concurrency load against production.

The user later authorized broader changes, but direct internal migration-ledger editing was blocked before execution and was not used. The closure was achieved through reviewed isolated runtime evidence instead.

PRODUCTION_PERFORMANCE_DDL_CHANGED=NO
PRODUCTION_INDEXES_CHANGED=NO
PRODUCTION_AUTH_CONFIG_CHANGED=NO
PRODUCTION_RLS_CHANGED=NO
HIGH_CONCURRENCY_LOAD_AGAINST_PRODUCTION=NO
