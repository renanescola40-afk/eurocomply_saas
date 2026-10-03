# RISCK COMPLY — Unused Index Review

Date: 2026-10-03
Lane: A / read-only production analysis
Production mutation: NONE
Main mutation: NONE

## Advisor scope

Supabase Performance Advisor currently reports exactly 92 `unused_index` findings.

These 92 indexes were reconciled against `pg_stat_user_indexes`, `pg_index`, `pg_constraint`, table activity counters, index size and index definitions.

## Evidence-based classification

- KEEP_OR_REVIEW: 42 indexes, 630,784 bytes total
- REVIEW_LATER: 50 indexes, 663,552 bytes total
- SAFE_DROP_CANDIDATE: 0 promoted at this stage

Total footprint of the 92 advisor-reported indexes is approximately 1.29 MB.

## Decision rationale

No production index should be dropped merely because `idx_scan = 0`.

Reasons include:

1. Statistics have accumulated since 2026-05-22 and do not represent a clean customer-only workload window.
2. Several indexes protect foreign-key, tenant, billing, background-job, enterprise, SCIM, webhook, evidence, incident or step-up access patterns that may be low-frequency today but material under enterprise use.
3. Current database size is small, so planner preference for sequential scans is often rational.
4. The total storage cost of all 92 findings is only ~1.29 MB, making immediate deletion economically immaterial.
5. The workload is currently heavily influenced by engineering, migration, RLS and assurance traffic.

## Representative KEEP_OR_REVIEW examples

- organization_members_org_user_id_idx
- ai_assessments_organization_id_idx
- idx_ai_assessments_ai_system_fk
- idx_ai_incidents_ai_system_fk
- ai_systems_org_created_at_idx
- compliance_tasks_org_created_at_idx
- documents_org_updated_at_idx
- risks_organization_id_idx
- subscriptions_organization_id_idx
- vendors_organization_id_idx
- enterprise tenant/FK support indexes

These should not be removed before isolated workload replay confirms they are redundant.

## Representative REVIEW_LATER examples

- ai_incidents_status_idx
- ai_incidents_severity_idx
- ai_systems_country_market_idx
- ai_systems_category_idx
- documents_file_hash_idx
- intelligence_items_* filtering indexes
- regulatory_updates_* indexes
- sales_leads_* indexes
- step_up_* queue/scope indexes
- enterprise queue/due partial indexes

Many of these are intentionally designed for future or low-frequency enterprise workloads and cannot be called waste solely from current scan counters.

## Current conclusion

`UNUSED_INDEX_FINDINGS_RECONCILED=YES`

`DROP_NOW=NO`

`SAFE_DROP_CANDIDATES_PROVEN=0`

This is a valid reconciliation outcome. The objective is performance correctness, not forcing the advisor count to zero.
