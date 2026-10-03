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

## Existing disposable branches
`maasec-pentest-20261001` is ACTIVE_HEALTHY at provider level but branch status is `MIGRATIONS_FAILED`. Its schema fingerprint is only 18 tables / 5 functions / 54 indexes / 3 triggers. It is not acceptable DR proof for current production and is not modified by this exercise.

## Classification
- Source recovery: PROVEN for repository availability and pinned main identification.
- Vercel rollback candidate identification: PROVEN non-destructively.
- Schema replay: NOT YET PROVEN.
- Backup restore: NOT YET PROVEN.
- Application recovery against recovered data plane: NOT YET PROVEN.
- RTO/RPO: NOT YET MEASURED.

No production, main, Stripe, Auth, RLS, DNS or email mutation was performed.
