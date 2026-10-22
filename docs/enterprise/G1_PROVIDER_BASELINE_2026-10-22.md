# G1 Enterprise 100 — Provider Baseline, 2026-10-22 (read-only)

**Scope source SHA:** `70d3545f414d063379d481fd238aed563e05edda`
**Purpose:** Record observed provider facts for reviewer re-check; **not** acceptance, certification, QA-runtime proof, release authorization, production repair approval or a new migration scheme.
**Evidence origin:** Direct authenticated GitHub, Vercel, Supabase and Stripe TEST provider readbacks during this execution cycle. No test was executed against authenticated product UI and no provider mutation was performed.

## P0-A — GitHub release governance

- GitHub API `GET /repos/renanescola40-afk/eurocomply_saas/branches/main`: `protected=false`, exact SHA `70d3545f414d063379d481fd238aed563e05edda`.
- Branch-protection detail endpoint returns `403 Resource not accessible by integration`; cannot claim inspection of every protection subrule.
- Rulesets API returns `403 Upgrade to GitHub Pro or make this repository public to enable this feature`. No paid upgrade or repository-visibility change is authorized.
- GitHub commit status contexts on current main: CircleCI `p0-postgres-synthetic` SUCCESS, `validar-risck` SUCCESS, and Vercel SUCCESS. These do **not** automatically prove all required security/E2E/release gates.
- Action: obtain an approved compensating mandatory merge/release control that cannot be bypassed by an unreviewed push; if not technically enforceable on this plan, keep `OPS-02=BLOCKED` and do not describe `main` as protected.

## P0-B — QA bootstrap and migration provenance

- Isolated QA Supabase project `zrxrrfbllsxtleyxjpsz` is `ACTIVE_HEALTHY`, but has **0** `public` application tables and **0** tracked app migrations.
- Production Supabase `tganhbbhfxcpblmgqprg` has **137** recorded migrations.
- GitHub `main` contains **359** files under `supabase/migrations`, all `.sql`. Exactly **15** use non-14-digit timestamp prefixes, **12** groups use duplicate 14-digit version prefixes (including one triplicate), and **25** production migration version identifiers have no file using the same 14-digit version in the primary migration directory. These version-only mismatches do **not** imply the SQL body is unavailable in approved reconciliation records.
- The current SQL folder has **219** parseable 14-digit version values absent from production's ledger. These are **not** automatically pending SQL writes; many may be legacy or superseded.
- Existing `scripts/supabase/audit-migration-drift.mjs`, `docs/runbooks/SUPABASE_MIGRATION_RECONCILIATION.md` and PR [#2559](https://github.com/renanescola40-afk/eurocomply_saas/pull/2559) govern migration reconciliation. Reuse them. Do **not** execute `db push --include-all`, broad replay or blind history repair.
- Action: produce an approved production-ledger-bound replay manifest with SQL hashes and object-level parity, independently review it, then bootstrap **QA only** in reviewed order. Production is not a replay target.

## P0-C — production counter integrity (read-only recheck)

- Current usage rows: **265**. Current membership rows: **208** (all have `status='active'`).
- Current aggregate anomaly: **2** usage organizations have divergent member/seat/admin counts; **both** have no membership rows. Sum deltas: **+3 active members, +3 full users, +2 active admins** versus live membership aggregation.
- This confirms the live P0-F drift remains open; see the separately owned repair candidate [#2556](https://github.com/renanescola40-afk/eurocomply_saas/pull/2556).
- Read-only query underlying the finding:

```sql
WITH actual AS (
  SELECT organization_id,
    COUNT(*) FILTER (WHERE status = 'active')::int AS active_members,
    COUNT(*) FILTER (WHERE status = 'active' AND seat_type = 'full')::int AS full_users,
    COUNT(*) FILTER (WHERE status = 'active' AND role IN ('owner','admin'))::int AS active_admins
  FROM public.organization_members GROUP BY organization_id
), d AS (
  SELECT (a.organization_id IS NULL) AS no_membership,
    u.active_members - COALESCE(a.active_members,0) AS delta_active,
    u.full_users - COALESCE(a.full_users,0) AS delta_full,
    u.active_admins - COALESCE(a.active_admins,0) AS delta_admins
  FROM public.organization_usage u LEFT JOIN actual a USING (organization_id)
)
SELECT COUNT(*) FILTER (WHERE delta_active IS DISTINCT FROM 0
       OR delta_full IS DISTINCT FROM 0 OR delta_admins IS DISTINCT FROM 0) AS drift_orgs,
       COUNT(*) FILTER (WHERE no_membership AND (delta_active IS DISTINCT FROM 0
       OR delta_full IS DISTINCT FROM 0 OR delta_admins IS DISTINCT FROM 0)) AS no_member_drift_orgs,
       SUM(delta_active) FILTER (WHERE delta_active IS DISTINCT FROM 0
       OR delta_full IS DISTINCT FROM 0 OR delta_admins IS DISTINCT FROM 0) AS sum_active_delta,
       SUM(delta_full) FILTER (WHERE delta_active IS DISTINCT FROM 0
       OR delta_full IS DISTINCT FROM 0 OR delta_admins IS DISTINCT FROM 0) AS sum_full_delta,
       SUM(delta_admins) FILTER (WHERE delta_active IS DISTINCT FROM 0
       OR delta_full IS DISTINCT FROM 0 OR delta_admins IS DISTINCT FROM 0) AS sum_admin_delta
FROM d;
```

- Action: let P0-F's single authorized owner complete native regression, recovery and separate explicit bounded production maintenance approval. Do not write production rows on this evidence alone.

## P0-E — Stripe TEST readiness (read-only)

- TEST account `acct_1U6IuJGt3cgjPOtq`: four active recurring euro prices were returned (including one zero-priced TEST object); three TEST subscriptions currently exist, including one `past_due`. Event inventory is nonempty.
- The **only** current TEST webhook endpoint returned has `status=disabled`. Its URL includes a bypass-style query parameter; neither the URL nor its value is included here. Treat query credentials as sensitive and review/rotate only with explicit approval.
- Events or prices do **not** prove accepted delivery, signature verification, idempotency or durable entitlements. In particular isolated QA has no app entitlement table yet.
- Action: once QA schema and preview environment are proven isolated, obtain explicit owner approval for any Stripe TEST endpoint configuration change, execute genuine signed events and validate persistent tenant-scoped entitlements. Never send TEST events to production data stores.

## Partial positive configuration readbacks (not final domain acceptance)

- Production Supabase `public` base/partitioned tables: **115**, and all **115** report both RLS and FORCE RLS enabled. This alone does not prove policies, tenant A/B isolation or privileged RPC boundaries.
- Production Vercel project `prj_APpXAyQFy1Gie50xfbO45zjkyUSm`, deployment `dpl_CmyiHWky6g41su26PE1nyGwwCS1f`, **READY**, SHA `70d3545f414d063379d481fd238aed563e05edda`. Verified domain `www.risckcomply.com` belongs to the project. Deployment inspector: https://vercel.com/renanescola40-afks-projects/eurocomply-saas/CmyiHWky6g41su26PE1nyGwwCS1f
- Public website/health runtime fetching was inconclusive in the current web environment; no claim of a successful browser smoke test.

## Evidence / non-mutation boundary

- Actions performed: authenticated read APIs and non-destructive SELECTs, GitHub writes **only** on isolated G1 scope branch.
- Actions **not** performed: authenticated SaaS runtime journeys, isolated QA migration replay, native PostgreSQL concurrency run, Stripe TEST event generation/delivery, production SQL writes, main branch push/merge, Vercel deploy or alias change, Stripe configuration change, emails, paid changes or customer data disclosure.
- No mandatory criterion is marked PASS merely by this baseline. Versioned acceptance remains in `config/g1-enterprise-scope-v1.json`.
