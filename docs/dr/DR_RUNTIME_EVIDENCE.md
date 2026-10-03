# DR Runtime Evidence — 2026-10-03

Status: RUNTIME REPLAY PROVEN / FULL DATA RESTORE OPEN.

## Current frozen source/runtime baseline

- GitHub `main`: `c0db317d604f47a2b87880e509d60a176587991e`
- Vercel production deployment: `dpl_8ovnjoSkexWBmqtQdErGMFH1sNdb`
- Vercel state: `READY`
- Vercel target: `production`
- Vercel Git SHA: `c0db317d604f47a2b87880e509d60a176587991e`
- Vercel rollback candidate: `true`
- Supabase production: `tganhbbhfxcpblmgqprg`
- Supabase production region: `eu-west-1`

Main and the active production deployment were revalidated as SHA-aligned at the end of this exercise.

## Dedicated disposable DR environment

- Supabase branch: `dr-runtime-proof-20261003`
- Branch id: `f9a0b3bd-4214-46ad-b2dc-4f985ade7018`
- Project ref: `golphfkmphanlntboxah`
- Parent: `tganhbbhfxcpblmgqprg`
- `with_data=false`
- Approved cost before creation: USD 0.01344/hour
- Final branch state observed: `FUNCTIONS_DEPLOYED`

The branch was isolated and did not copy production customer data.

## Canonical migration replay

The clean branch initially reproduced historical replay drift and failed at multiple older prerequisites/ACL guards. The failures were diagnosed from PostgreSQL runtime evidence and repaired only inside the disposable DR project using branch-only compatibility bridges derived from either the current Production catalog or the canonical historical source.

Final result:

- canonical production migrations expected through `20261003173930`: **113**
- canonical migrations applied in DR: **113**
- canonical migrations missing: **0**
- `DATABASE_REPLAY=100%`

The replay crossed the full current sequence including payment-first, trusted access, active membership authority, SSO, audit-chain hardening, billing isolation, cross-tenant reference integrity, Data Governance, FRIA, prohibited-practices, sales-console, transactional-email, MFA terminal hardening and the final 2026-10-03 risk/incident fixes.

## Final structural fingerprint

DR:
- public tables: **107**
- public tables with RLS: **107**
- public functions: **127**
- public indexes: **334**
- non-internal public triggers: **68**
- public foreign keys: **238**
- unvalidated foreign keys: **0**

Production:
- public tables: **107**
- public tables with RLS: **107**
- public functions: **134**
- public indexes: **417**
- non-internal public triggers: **73**
- public foreign keys: **250**
- unvalidated foreign keys: **1**

Therefore:
- table parity: **107/107**
- RLS-enable parity: **107/107**
- canonical migration replay: **113/113**
- exact auxiliary-object parity: **NOT YET IDENTICAL**

The remaining count differences must not be represented as full schema identity.

## Data isolation evidence

During the exercise the DR project was observed with zero copied production identities/customer rows in the checked core surfaces:
- auth users: 0
- organizations: 0
- memberships: 0
- entitlement sources: 0
- Stripe events: 0

No real customer credentials were copied into the branch.

## Post-replay advisors

Security advisor findings captured after the replay:
- `rls_enabled_no_policy`: 31 INFO
- `function_search_path_mutable`: 1 WARN (`public.prevent_ai_qms_decision_mutation`)
- authenticated-executable SECURITY DEFINER functions: 2 WARN (`enterprise_member_can_read`, `enterprise_member_can_manage`)

Performance advisor findings included:
- unindexed foreign keys: 104 INFO
- multiple permissive policies: 11 WARN
- duplicate index: 1 WARN
- Auth DB connection allocation strategy: INFO

These are recorded as findings, not silently converted to PASS or vulnerabilities without comparison to the intended production authority model.

## Synthetic tenant runtime test

A fresh two-tenant Auth/RLS fixture was attempted in the isolated branch. The connected execution environment blocked synthetic writes to `auth.users`. The restriction was not bypassed.

Therefore:
- RLS structure: PROVEN
- canonical tenant-authority migrations: PROVEN
- new connector-executed cross-tenant fixture: NOT EXECUTED due tool safety restriction

## Recovery-time observation

Disposable branch creation began at `2026-10-03T18:16:11Z`. Full canonical replay and `FUNCTIONS_DEPLOYED` were observed around `2026-10-03T20:25Z`.

Observed schema/control-plane recovery exercise elapsed time: approximately **2h09m**.

This is an actual exercise duration and is below the documented initial 4-hour core RTO target, but it is **not** full application RTO because customer-data restore and recovered-application smoke were not completed.

## Classification

- SOURCE_RECOVERY=PROVEN
- CURRENT_MAIN_PRODUCTION_SHA_ALIGNMENT=PROVEN
- DISPOSABLE_DR_ENVIRONMENT=PROVEN
- CANONICAL_DATABASE_REPLAY=PROVEN
- PUBLIC_TABLE_PARITY=PROVEN
- RLS_ENABLE_PARITY=PROVEN
- CLEAN_REPLAY_DRIFT_REPRODUCTION=PROVEN
- VERCEL_ROLLBACK_CANDIDATE_IDENTIFICATION=PROVEN
- CUSTOMER_DATA_BACKUP_RESTORE=NOT_PROVEN
- APPLICATION_RECOVERY_AGAINST_RECOVERED_DATA=NOT_PROVEN
- RPO=NOT_PROVEN
- FRESH_SYNTHETIC_TENANT_RUNTIME_TEST=BLOCKED_BY_CONNECTED_TOOL
- EXACT_AUXILIARY_SCHEMA_PARITY=OPEN

## Safety attestations

- PRODUCTION_CHANGED=NO
- MAIN_CHANGED=NO
- STRIPE_CHANGED=NO
- AUTH_PRODUCTION_CHANGED=NO
- VERCEL_PRODUCTION_CHANGED=NO
- EMAIL_SENT=NO
- MAASEC_TARGET_CHANGED=NO
