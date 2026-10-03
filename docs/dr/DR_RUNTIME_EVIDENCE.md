# DR Runtime Evidence — 2026-10-03

Status: IN PROGRESS — evidence-first; no production mutation.

## Frozen baselines
- GitHub main observed SHA: `1411d8f4ac861ab32bb61ca55648cfcc5af8f15a`.
- Supabase production: `tganhbbhfxcpblmgqprg`, ACTIVE_HEALTHY, eu-west-1, Postgres 17.6.1.127.
- Vercel production deployment: `dpl_Ew8oT6HU7PzrrFtnqjEQuVgUq9ow`, READY, SHA `1411d8f4ac861ab32bb61ca55648cfcc5af8f15a`, rollback candidate.

## Production schema fingerprint (read-only)
Observed 2026-10-03:
- public base tables: 107
- public tables with RLS enabled: 107
- public functions: 134
- public views: 0
- public indexes: 417
- non-internal public triggers: 73

## Dedicated disposable DR branch
Created with explicit owner cost approval:
- branch name: `dr-runtime-proof-20261003`
- branch id: `f9a0b3bd-4214-46ad-b2dc-4f985ade7018`
- project ref: `golphfkmphanlntboxah`
- parent production ref: `tganhbbhfxcpblmgqprg`
- with_data: false
- hourly cost confirmed before creation: USD 0.01344/hour

The branch is isolated and contains no production data copy.

## Clean replay finding
Initial branch creation reached `MIGRATIONS_FAILED` after migration `20260812224650_tighten_permissions_catalog_authenticated_grants` and before `20260812225906_consolidate_canonical_rls_and_client_grants`.

Postgres runtime logs prove the branch replay executed an older guard body for `20260812225906` that required all canonical policies on every existing target table and raised at the canonical RLS guard. The current GitHub `main` file at SHA `1411d8f4ac861ab32bb61ca55648cfcc5af8f15a` contains later historical clean-replay compatibility logic using a `materialized` CTE, allowing a legitimate 0/N policy state and failing only on partial materialization. Therefore the Supabase branch replay source and the current GitHub migration source are not semantically identical at this migration.

## DR-only replay bridge
To continue the isolated exercise without changing production, a branch-only migration `dr_replay_bridge_canonical_rls_20261003` was applied to the disposable DR project. It idempotently materialized the canonical production-equivalent RLS policies needed by the stale historical guard for:
- `subscriptions`
- `audit_logs`
- `invitations`

Policy definitions were copied from the live production catalog using read-only inspection. Production was not modified. The branch was then rebased against production to retry replay.

## Existing pentest branches
`maasec-pentest-20261001` and `beagle-pentest-20260909` remain untouched and continue to report `MIGRATIONS_FAILED`. They are not used as DR evidence targets.

## Classification
- Source recovery: PROVEN for repository availability and pinned main identification.
- Vercel rollback candidate identification: PROVEN non-destructively.
- Dedicated isolated DR environment: PROVEN.
- Clean replay defect reproduction: PROVEN.
- Root cause isolation for first replay failure: PROVEN.
- Schema replay: IN PROGRESS; not yet accepted as PROVEN until the branch reaches the production migration head and schema/security fingerprints reconcile.
- Backup restore: NOT YET PROVEN.
- Application recovery against recovered data plane: NOT YET PROVEN.
- RTO/RPO: NOT YET FULLY MEASURED.

## Safety attestations
- PRODUCTION_CHANGED=NO
- MAIN_CHANGED=NO
- STRIPE_CHANGED=NO
- AUTH_CHANGED=NO
- VERCEL_PRODUCTION_CHANGED=NO
- EMAIL_SENT=NO
- MAASEC_TARGET_CHANGED=NO
