# G1 — Supabase Pro disposable QA branch replay outcome (2026-10-22)

**Scope:** Readback of explicitly owner-approved single branch creation and safe cleanup. This is provider evidence, NOT Enterprise 100 acceptance.

## Authorization and cost

- Subscription: existing organization Pro / tier_pro.
- Owner's explicit response to prior cost authorization: `sim`.
- Provider cost quote repeated immediately before creation: **USD 0.01344 hourly** (`get_cost(type=branch, organization_id=jdtqfjdqljeqgitvgnea)`).
- `confirm_cost` supplied a creation confirmation token (not included in this artifact).
- No other project, compute change, paid add-on or external service was ordered.
- Billing note: the provider may charge for some portion of the short-lived branch runtime; no zero-invoice or exact-duration claim is made.

## Branch lifecycle

| Field | Exact provider readback |
|---|---|
| Parent project | `tganhbbhfxcpblmgqprg` |
| Created branch | `g1-enterprise100-qa-20261022` |
| Branch ID | `330d1195-323a-4a23-83a6-7005e1162137` |
| Project ref | `bkirixbszwmzulcelbxg` |
| Created at (provider UTC) | `2026-10-22T20:34:57.706003+00:00` |
| Copied production data | `with_data=false` |
| Initial state | `CREATING_PROJECT` |
| Intermediate state | `FUNCTIONS_DEPLOYED`, project `ACTIVE_HEALTHY` |
| Terminal replay state | `MIGRATIONS_FAILED`, project `ACTIVE_HEALTHY` |
| Last applied migration | `20260812224650_tighten_permissions_catalog_authenticated_grants` |
| Applied migrations | 26 / 137 production |
| App public tables | 14 / 115 production |
| Public tables with RLS | 14 / 115 production |
| Public FORCE RLS | 4 / 115 production |
| Auth users before cleanup | 0 |
| Storage objects before cleanup | 0 |

## Root-cause log evidence

Supabase `query_logs` on the newly created branch, `postgres_logs`, 2026-10-22 20:35:35 UTC:

```
canonical RLS policy missing after consolidation: 12
```

The failure occurs after historical migration `20260812224650`, consistent with the known next failing historical migration `20260812225906_consolidate_canonical_rls_and_client_grants`.

Important provenance: the current main-repository SQL of that migration contains a reviewed 0/N-versus-partial-policy historical replay guard; the SQL historically recorded/applied through the provider's production ledger differs. A source-only patch is not sufficient to guarantee that Supabase branch creation will replay the corrected statement. The existing investigation `docs/performance/migration-replay-drift-closure-2026-10-03.md` already identified this class of source/ledger divergence. This new provider branch reproduces it on 2026-10-22.

**This failure is not a PASS and is not evidence that the production runtime is failing.** A branch can report `ACTIVE_HEALTHY` for the service while remaining `MIGRATIONS_FAILED` for SaaS schema replay.

## Safe cleanup readback

- Immediately before deletion the branch was explicitly confirmed `is_default=false`, `persistent=false`, `with_data=false`, `status=MIGRATIONS_FAILED`.
- Read-only branch SQL confirmed `auth.users=0`, `storage.objects=0`, `supabase_migrations.schema_migrations=26`.
- This specific new disposable branch was the only deletion target.
- Provider `delete_branch(branch_id=330d1195-323a-4a23-83a6-7005e1162137)` returned `success=true`.
- Subsequent `list_branches(parent)` readback showed only unchanged `main`, `beagle-pentest-20260909`, and `maasec-pentest-20261001`. The temporary G1 branch is absent.
- No existing pentest branch, protected work, production table, user, storage object, or migration ledger was reset, deleted, or modified.

## Disposition and continuation

- **NEW_QA_BRANCH_CREATED=YES, THEN_SAFELY_DELETED=YES**
- **CANONICAL_PRODUCTION_BRANCH_REPLAY=FAIL**
- **FAILED_BRANCH_CONTINUING_COMPUTE_ACCRUAL=STOPPED_BY_DELETION**
- **NEW_SUBSCRIPTION_OR_PLAN_UPGRADE=NO**
- **PRODUCTION_WRITES=0**
- **EXISTING_INDEPENDENT_QA=`zrxrrfbllsxtleyxjpsz`** (the previously confirmed empty, `ACTIVE_HEALTHY` project)
- **ENTERPRISE_100_ACCEPTANCE=NO_PASS**

Use [PR #2559](https://github.com/renanescola40-afk/eurocomply_saas/pull/2559) to resolve the existing ledger-bound, statement-digest, dependency and RLS postcondition prerequisites. Do not create another paid branch with the unchanged production migration ledger: it is presently expected to reproduce the same failure. The isolated independent QA remains the preferred next test environment after a reviewed replay manifest becomes executable. Full replay, Auth/RLS tenant proofs, signed Stripe TEST events, and app E2E remain blocked.

**No cost authorization for a second branch or any other resource is implied by the one-branch approval.**
