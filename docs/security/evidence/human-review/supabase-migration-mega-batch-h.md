# Supabase migration Human Review — Mega Batch H

Status: **OWNER-REVIEWED CLASSIFICATION — CANONICAL DECISION GATE STILL BLOCKED**

Human reviewer: **Renan Rodrigues Cerqueira da Silva**
Reviewer role: **Repository owner / human classification reviewer**
Reviewed at: **2026-08-10T09:42:00+01:00**
Immutable subject SHA: `def59573bf2dbd2ad447f8f493048b0296be21ff`
Legacy conversation progress after H: **71/211**
Verified current-inventory owner-classification progress after H: **41/211**
Canonical reconciliation status: **NOT ACCEPTED FOR STAGING**
Independent approver: **PENDING — not fabricated by this record**

## Provenance and truth boundary

This file records the owner's human classification decisions from the review conversation. It is **not** the canonical sealed decision document and must not be copied into the canonical decision artifact without the classification-specific evidence required by the Decision Gate.

Subject inventory provenance:

- source workflow: `Supabase Production Migration Dry Run`;
- source run ID: `31361564127`;
- exact source run SHA: `def59573bf2dbd2ad447f8f493048b0296be21ff`;
- retained artifact ID: `9052542299`;
- retained artifact name: `supabase-production-migration-dry-run-def59573bf2dbd2ad447f8f493048b0296be21ff`;
- artifact digest: `sha256:71671c1e48bda901f5e488994bd30be0fcc1d5783c0bcda953515dba4b44e895`;
- reconciliation inventory SHA-256: `cd453965b7e93b5ca5853838db1ba2ce561650fd30e865655f60891439158122`;
- files requiring classification in that inventory: `211`.

The Decision Gate additionally requires exact schema/object evidence, per-item reviewer metadata, zero unresolved split-review items, a sealed decision for all 211 inventory items, and a **distinct independent approver**. Those conditions are not satisfied by this batch record alone.

## Legacy A–D ledger correction

The earlier conversation carried a `30/211` baseline from Human Review Batches A–D. Reconciliation against the immutable `def595…` inventory shows that this historical baseline cannot be treated as current Decision-Gate classification credit:

- the recovered A–D records used a generic `Approved` label rather than one of the current Decision Gate classes (`ALREADY_PRESENT_IN_SCHEMA`, `PENDING_DEPLOYMENT`, `SUPERSEDED`, `ARCHIVE_LEGACY`, `REQUIRES_SPLIT_REVIEW`);
- multiple recovered A–D filenames no longer exist in the current 211-item reconciliation inventory;
- five recovered `20260605_*` files still exist, but their old generic approval is not a current classification decision and therefore they must be classified again under the current inventory contract;
- the five still-present recovered files show no Git commits after the old review timestamp, which is useful continuity evidence but does not convert the old generic approval into a current Decision Gate class.

Therefore two counters are kept separately:

- **legacy conversation progress after H: 71/211** — historical continuity only;
- **verified current-inventory owner-classification progress after H: 41/211** — Batch E (2) + F (13) + G (14) + H (12), all expressed using current reconciliation classification semantics and tied to the current inventory lineage.

The 30 legacy A–D items are not deleted; they are quarantined from the current numerator until each applicable current-inventory file receives a valid current classification. This correction prevents stale approvals from being represented as exact-inventory evidence.

## Owner-reviewed decisions

| ID | Migration | Classification | Owner-review rationale / evidence boundary |
| --- | --- | --- | --- |
| H1 | `20260724103000_enterprise_seat_concurrency.sql` | `REQUIRES_SPLIT_REVIEW` | Live seat tables/RPCs are partially present, but the effective membership contract is incomplete; keep blocked behind the Batch G `organization_members` reconciliation and an immutable split-review dossier. |
| H2 | `20260724193000_enterprise_entitlement_billing_reconciliation.sql` | `REQUIRES_SPLIT_REVIEW` | The original function targets seat-policy column names that differ from the live contract; it cannot be credited or repaired as a whole without object/ACL proof. |
| H3 | `20260730094500_fix_enterprise_entitlement_seat_policy_contract.sql` | `REQUIRES_SPLIT_REVIEW` | The later function shape aligns with the live seat-policy contract, but complete function-definition and privilege/grant evidence is still required before history treatment. |
| H4 | `20260621091500_subscription_org_index.sql` | `ALREADY_PRESENT_IN_SCHEMA` | Semantic/live inspection indicated the target index state is present. This remains only an owner-reviewed **history-repair candidate** until exact immutable object proof is attached to the canonical decision. |
| H5 | `20260606131500_email_notification_events_entity_id_text.sql` | `PENDING_DEPLOYMENT` | Semantic object evidence reported the parsed target state absent; protected staging evidence and rollback planning remain required. |
| H6 | `20260622120000_dashboard_performance_indexes.sql` | `PENDING_DEPLOYMENT` | Semantic object evidence reported the parsed target indexes absent; protected staging remains required. |
| H7 | `20260624120000_billing_documents_performance_indexes.sql` | `PENDING_DEPLOYMENT` | Semantic object evidence reported the parsed target indexes absent; protected staging remains required. |
| H8 | `20260624170400_live_rls_validation_drop_apply_helpers.sql` | `PENDING_DEPLOYMENT` | This migration removes validation helpers and **must never execute as a standalone terminal step**; see the mandatory H8 companion constraint below. |
| H9 | `20260627090000_sales_leads.sql` | `PENDING_DEPLOYMENT` | Semantic object evidence reported the parsed target state absent; protected staging remains required. |
| H10 | `20260721114500_enterprise_integrations_tenant_relations.sql` | `PENDING_DEPLOYMENT` | Semantic object evidence reported the parsed target state absent; protected staging remains required. |
| H11 | `20260725180000_enterprise_access_operations_explicit_deny_policies.sql` | `PENDING_DEPLOYMENT` | Semantic object evidence reported the parsed policy states absent; protected staging remains required. |
| H12 | `20260803133100_article_50_claim_evidence_constraints.sql` | `PENDING_DEPLOYMENT` | Semantic object evidence reported the parsed constraint states absent; protected staging remains required. |

## Owner-reviewed reconciliation sequencing

The owner-reviewed relative sequence for the pending-deployment subset is:

`HP1=H5 → HP2=H6 → HP3=H7 → HP4=H8 → HP5=H9 → HP6=H10 → HP7=H11 → HP8=H12`.

This is a reconciliation dependency/order decision only. It is **not** an executable production migration plan.

## Mandatory H8 companion constraint

`H8 = 20260624170400_live_rls_validation_drop_apply_helpers.sql` drops the `live_rls_validation_apply_*` helpers. The immediately following migration `20260624170500_live_rls_validation_policy_patch.sql` recreates the validation helpers used by later live-RLS work.

Therefore:

- H8 must remain **execution-blocked** until `20260624170500_live_rls_validation_policy_patch.sql` receives its own human classification and immutable evidence;
- any future executable plan containing H8 must place the companion policy patch immediately after H8 in the same protected rehearsal/change unit;
- a plan that ends after H8 is invalid and must fail closed;
- the companion migration is **not** counted as part of the 12 H decisions in this record.

## Split-review constraints

- H1 remains dependent on the `organization_members` reconciliation classified in Mega Batch G. Existing live seat tables/RPCs are not sufficient to authorize history repair while expected membership fields are incomplete.
- H2 and H3 remain `REQUIRES_SPLIT_REVIEW`; no migration-history repair is authorized until the effective function contract and ACL/grant state are proven completely.
- H4 remains an `ALREADY_PRESENT_IN_SCHEMA` **candidate decision** in the owner-review ledger only; the canonical Decision Gate still requires immutable exact object evidence before it can become a repair candidate in the sealed document.

## Canonical acceptance prerequisites still open

This batch record deliberately does not claim the repository's `RECONCILIATION_ACCEPTED_FOR_STAGING` state. Before canonical acceptance, the repository workflow still requires, among other controls:

1. a supported classification for every one of the 211 immutable inventory items;
2. zero `REQUIRES_SPLIT_REVIEW` items;
3. classification-specific immutable schema/supersession/archival evidence;
4. per-item reviewer identity, role, rationale and timestamp in the canonical decision document;
5. a distinct independent approver with an immutable approval reference;
6. deterministic decision and approval digests;
7. a sealed canonical evidence document validated by the Decision Gate.

## Explicit safety boundary

This human approval authorizes **classification discussion and reconciliation planning only**.

It does **not** authorize:

- SQL execution;
- migration execution;
- `supabase migration repair` or any history mutation;
- backfill;
- `supabase db push`;
- production deployment;
- schema mutation;
- data mutation.

`productionWriteAuthorized = false`
`migrationHistoryModified = false`
`databaseModifiedByThisDecision = false`
`canonicalDecisionAccepted = false`
`independentApprovalPresent = false`

## Approval statement

> Eu, Renan Rodrigues Cerqueira da Silva, revisei o Human Review Packet Mega Batch H do SHA def59573bf2dbd2ad447f8f493048b0296be21ff e aprovo as 12 classificações propostas: H1, H2 e H3 como REQUIRES_SPLIT_REVIEW; H4 como ALREADY_PRESENT_IN_SCHEMA; H5 a H12 como PENDING_DEPLOYMENT, com sequencing relativo HP1 a HP8 conforme apresentado. Reconheço que H1 permanece dependente da reconciliação de organization_members do Batch G e que H2/H3 não autorizam history repair até a prova completa de contrato e ACL. Esta aprovação é apenas de classificação e reconciliation; não autoriza execução de SQL, migration repair, backfill, db push ou deploy em produção.

This quoted owner approval is preserved verbatim as conversational review evidence. It is **not** represented as the distinct independent approval required by the canonical Decision Gate.
