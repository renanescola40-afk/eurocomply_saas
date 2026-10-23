# RISCK COMPLY — Supabase Pro QA Branch Decision (2026-10-22)

**Evidence type:** authenticated provider readback, not Enterprise 100 acceptance.  
**Owner direction:** use included Supabase Pro capabilities, zero unapproved new spending; production cannot be used as QA.  
**Main application SHA:** `70d3545f414d063379d481fd238aed563e05edda` at time of evaluation.  
**Related scope:** `config/g1-enterprise-scope-v1.json` — DAT-01 / SEC-03 / QAT-02 / QAT-03 / BIL-03 / OPS-06.

## Verified organization and production
- Supabase organization `jdtqfjdqljeqgitvgnea`: `plan=pro`, `tier=tier_pro` from `get_organization`.
- Parent project `tganhbbhfxcpblmgqprg`: `ACTIVE_HEALTHY`, `eu-west-1`, Postgres 17 / 17.6.1.127.
- No new project, branch, resource, compute size or add-on was requested or created.

## Existing branches (parent project `tganhbbhfxcpblmgqprg`)
| Branch | project ref | provider state | reuse decision |
|---|---|---|---|
| `main` | `tganhbbhfxcpblmgqprg` | `FUNCTIONS_DEPLOYED`, preview `ACTIVE_HEALTHY` | Production; forbidden as QA |
| `beagle-pentest-20260909` | `vfqxmiaaagqpbwrrroww` | `MIGRATIONS_FAILED`, preview `INACTIVE`, `with_data=false` | Not safely reusable without owner/state provenance and repair |
| `maasec-pentest-20261001` | `tynfhdhfdnauxrbdhmvf` | `MIGRATIONS_FAILED`, preview `INACTIVE`, `with_data=false` | Not safely reusable without owner/state provenance and repair |

Additional read-only attempts to fetch the old branch projects returned `Project not found` and their migration/table inspection timed out; status and exact failing SQL cannot be independently inspected through current connected project queries. **Do not delete, reset, rebase or promote those old branches.**

## Existing independent QA project — preferred zero-new-resource-cost path
- ID: `zrxrrfbllsxtleyxjpsz`, `risck-comply-v15c-isolated-qa-20261022`.
- Status: `ACTIVE_HEALTHY`, `eu-west-1`, PostgreSQL 17 / 17.11.0.003.
- Read-only SQL confirms:
  - `public` application tables = **0**
  - `public` RLS policies = **0**
  - `public` routines = **0**
  - `auth.users` = **0**
  - `storage.buckets` = **0**
  - `storage.objects` = **0**
  - `to_regclass('supabase_migrations.schema_migrations') is not null` = **false**
- `list_migrations` and `list_tables(public)` both returned empty lists.
- Security advisors returned no lint notices, but with zero application tables this is **not** proof of tenant security.
- This project is **not** a production branch and has a different major Postgres minor version: parity must be checked later for dependent database behavior.
- Project already exists; no new resource provisioning has been incurred by this review. Current subscription/usage billing of the existing project remains a separate provider matter.

## New branch actual provider cost and decision
- Direct `mcp__Supabase__get_cost({type:'branch', organization_id:'jdtqfjdqljeqgitvgnea'})` response:
  - `type=branch`
  - `recurrence=hourly`
  - `amount=0.01344` (USD, from provider pricing).
- This is **nonzero**, so a new branch is **NOT AUTHORIZED for creation** until the owner explicitly approves this particular recurring cost.
- Branch creation can incur additional Compute, Disk, Egress and Storage consumption; branching compute is not covered by the plan's compute credits according to Supabase documentation: https://supabase.com/docs/guides/platform/manage-your-usage/branching.
- Do **not** issue `confirm_cost`, `create_branch`, `create_project`, `reset_branch`, `delete_branch`, or `merge_branch` based on this document.

## Safe next steps, ordered
1. Do **not** try branch creation while the $0.01344/hour cost is unapproved. Prefer the existing healthy independent QA project.
2. Review provenance and per-entry source/provider SQL digests, and schema postconditions for the production-ledger-bound replay candidate already in [PR #2559](https://github.com/renanescola40-afk/eurocomply_saas/pull/2559). Candidate is `CANDIDATE_NOT_EXECUTABLE` and must not be blindly replayed.
3. Obtain an independently approved, hash-pinned, dependency-ordered **QA-only** replay plan. Run negative validation against version mismatches and prevent production-target SQL execution.
4. Apply only the reviewed schema migrations to `zrxrrfbllsxtleyxjpsz` once isolated QA invariants and rollback method are accepted. No production data, synthetic fixtures only.
5. Read back exact migration list, schema/object/RLS/grants fingerprints and re-run QA advisor checks.
6. Test Auth + Storage, negative and positive tenant A/B journeys, privileged RPC denials, authenticated P0-F writer, and real Stripe TEST signed-webhook durability in QA.
7. Bind outcomes to exact app SHA, QA project, test event identifiers, timestamps and reviewer. Do not carry tests to production without separate release authorization.

## Current bounds and decisions
- `SUPABASE_PRO_VERIFIED=YES`
- `EXISTING_SUITABLE_DEVELOPMENT_BRANCH=NO` (based on current provider status, not an exhaustive forensic proof of the old branches)
- `NEW_BRANCH_COST_USD_PER_HOUR=0.01344`
- `NEW_BRANCH_CREATED=NO`
- `EXISTING_ISOLATED_QA_PROJECT=YES`
- `QA_APP_SCHEMA_BOOTSTRAPPED=NO`
- `AUTHENTICATED_E2E_VERIFIED=NO`
- `PRODUCTION_DATA_WRITES=0`
- `ENTERPRISE_SCOPE_100=NO_PASS`

**Review only:** this entry creates no owner approval or release authority by itself.
