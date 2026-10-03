# Recovery Integrity Report — 2026-10-03

## Recovery target

Dedicated non-production Supabase DR project:
- `golphfkmphanlntboxah`
- parent Production: `tganhbbhfxcpblmgqprg`
- final state: `FUNCTIONS_DEPLOYED`

## Canonical migration integrity

- canonical migrations expected: **113**
- canonical migrations applied: **113**
- canonical migrations missing: **0**

`CANONICAL_MIGRATION_INTEGRITY=PASS`

## Table / RLS integrity

Final DR:
- public tables: **107**
- RLS-enabled public tables: **107**

Production:
- public tables: **107**
- RLS-enabled public tables: **107**

`PUBLIC_TABLE_PARITY=PASS`
`RLS_ENABLE_PARITY=PASS`

## Referential integrity

DR:
- public foreign keys: **238**
- unvalidated foreign keys: **0**

Production:
- public foreign keys: **250**
- unvalidated foreign keys: **1**

All foreign keys materialized in the recovered DR environment are validated. Exact FK-count parity is not claimed.

`RECOVERED_FK_VALIDATION=PASS`
`EXACT_FK_PARITY=OPEN`

## Auxiliary-object parity

Final counts:

| Object | DR | Production |
|---|---:|---:|
| Public functions | 127 | 134 |
| Public indexes | 334 | 417 |
| Public triggers | 68 | 73 |
| Public foreign keys | 238 | 250 |

The recovery exercise proves canonical migration completion and table/RLS parity, but these counts show that the Production database retains auxiliary objects not recreated by the canonical branch replay plus the explicit compatibility bridges.

`EXACT_AUXILIARY_OBJECT_PARITY=OPEN`

This residual must not be hidden by calling the schemas byte-for-byte identical.

## Data isolation

The DR branch used `with_data=false`. Core checks during the exercise showed no copied production users, organizations, memberships, entitlement sources or Stripe events.

`PRODUCTION_DATA_COPIED=NO`

## Tenant-isolation runtime test

A new two-tenant synthetic Auth fixture was attempted against the isolated branch. The connected execution environment blocked writes to `auth.users`. That restriction was not bypassed.

Therefore:
- RLS schema and canonical authority migrations: PROVEN
- fresh synthetic cross-tenant runtime test in this exercise: NOT EXECUTED

`FRESH_TENANT_RUNTIME_TEST=TOOL_BLOCKED`

## Security advisor evidence

Post-replay security advisors were captured:
- 31 RLS-enabled/no-policy INFO findings
- 1 mutable-search-path WARN
- 2 authenticated-executable SECURITY DEFINER WARN findings

These require intent/Production comparison and are not automatically treated as vulnerabilities or ignored.

## Verdict

- CANONICAL_REPLAY_INTEGRITY=PASS
- PUBLIC_TABLE_PARITY=PASS
- RLS_ENABLE_PARITY=PASS
- RECOVERED_FK_VALIDATION=PASS
- DATA_ISOLATION=PASS
- EXACT_AUXILIARY_OBJECT_PARITY=OPEN
- FRESH_TENANT_RUNTIME_TEST=TOOL_BLOCKED
- CUSTOMER_DATA_RESTORE_INTEGRITY=NOT_APPLICABLE_NOT_RESTORED
