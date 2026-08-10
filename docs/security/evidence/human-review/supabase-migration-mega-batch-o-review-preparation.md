# Supabase Migration Human Review — Mega Batch O Preparation

Status: **NON-CREDITING REVIEW PREPARATION — OWNER DECISION NOT RECORDED**

Prepared at: **2026-08-10T20:52:00+01:00**  
Immutable subject SHA: `def59573bf2dbd2ad447f8f493048b0296be21ff`  
Reconciliation inventory SHA-256: `cd453965b7e93b5ca5853838db1ba2ce561650fd30e865655f60891439158122`  
Inventory size: **211**  
Historical owner-review claim after Batch N: **145/211**  
Strict exact-fingerprint owner-review baseline: **143/211 (67.77%)**  
Batch-E historical claims quarantined/non-crediting: **2**  
Exact-fingerprint inventory remaining before owner review of this packet: **68/211 (32.23%)**  
Canonical reconciliation status: **NOT ACCEPTED FOR STAGING**  
Independent approver: **PENDING — not fabricated by this preparation**

## Why the strict baseline is 143/211

Mega Batch H carried forward two current-inventory review credits from Mega Batch E, but the exact immutable filenames and SQL SHA-256 fingerprints for those two credits were not recovered from trustworthy retained evidence.

The later F-through-N evidence lineage is reconstructable exactly:

- review rows parsed from F-N: **152**;
- exact unique immutable filenames: **143**;
- exact reaffirmations: **9**, matching the Batch-L deduplication correction;
- Batch-E historical claims: **2**, retained as `QUARANTINED_NON_CREDITING`;
- exact-fingerprint numerator: **143**, not 145.

This does not revoke the historical Batch-E statement. It prevents an unidentified historical claim from consuming an unknown filename in the machine-selected remaining set. If an old Batch-E item is selected again and explicitly reviewed with its exact fingerprint, it receives exact credit once; the quarantined historical claim remains non-crediting.

## Provenance

- source workflow: `Supabase Production Migration Dry Run`;
- source run ID: `31361564127`;
- retained artifact ID: `9052542299`;
- retained artifact digest: `sha256:71671c1e48bda901f5e488994bd30be0fcc1d5783c0bcda953515dba4b44e895`;
- immutable inventory digest: `sha256:cd453965b7e93b5ca5853838db1ba2ce561650fd30e865655f60891439158122`;
- owner evidence normalized from Batches F, G, H, I, J, K, L, M and N;
- selection order: deterministic inventory `version → filename → SQL SHA-256`;
- automatic classifications created: **0**.

## Non-crediting candidate review

The classifications below are **technical recommendations for the repository owner's next human decision**. They are not owner-approved classifications and contribute zero review credit unless the owner explicitly reviews and approves them.

| ID | Migration | Inventory SHA-256 | Technical recommendation | Rationale / dependency boundary |
| --- | --- | --- | --- | --- |
| O1 | `20260606000100_create_compliance_metric_snapshots.sql` | `fdbca401fef8059cae880b976322c783dae61cc67280b29e4a4d5a816bd108b4` | `REQUIRES_SPLIT_REVIEW` | Competes with O2 for the same table. O1 gives `snapshot_date` a `current_date` default and installs admin-manage policies; `CREATE TABLE IF NOT EXISTS` means O2 cannot reconcile that default, while permissive policies may accumulate. |
| O2 | `20260606120000_compliance_metric_snapshots.sql` | `9f6c7bbc38b8be97bfcb76867f378109e18f4315c7ee3ea75a82f9e6c69abcb9` | `REQUIRES_SPLIT_REVIEW` | Competes with O1 with different `snapshot_date` semantics and broader member insert/update policies. Requires one canonical target schema/policy state. |
| O3 | `20260619103000_complete_multi_tenant_rls_policies.sql` | `7fcd6f6ca79bee3ec66493dd969fee2b81fbfb2fa60825780a39c3f373192c3a` | `PENDING_DEPLOYMENT` | Creates the broad tenant-RLS helper/policy foundation. It creates `is_org_member(uuid)`, not the distinct `is_organization_member(uuid)` helper still missing for N7/N13. |
| O4 | `20260619110000_rls_backend_controlled_writes.sql` | `738f46145797b9de49e99817a041b2fa34e7b71c6deb2fcc7fa07bdc134a099a` | `PENDING_DEPLOYMENT — PREREQUISITE_BLOCKED` | Backend-controls organization/invitation writes and calls `has_org_role(uuid,text[])`; requires O3 or another proven canonical helper foundation first. |
| O5 | `20260619111500_lock_backend_owned_rls_writes.sql` | `78ba00a634def95268662a925b16e75992c67a28adfae428c3bddea4baf0e42e` | `PENDING_DEPLOYMENT — PREREQUISITE_BLOCKED` | Further backend-only write lock. Overlaps O4 but does not replace O4's select-admin treatment; rehearse after the O3/O4 policy foundation. |
| O6 | `20260619130000_drop_legacy_permissive_rls_policies.sql` | `a12b90a97045ad5bb403bb1e99fc768baf05cdd4c803a25b4507f0f3a334c4eb` | `PENDING_DEPLOYMENT` | Removes known legacy permissive policies that could remain OR-ed with stricter policies. Evaluate as part of the O3→O4→O5→O6 final-state chain. |
| O7 | `20260619_multi_tenant_rls_hardening.sql` | `a97d83b1d662df19de92404a39896e0c50809934de6c088a39351e3463071898` | `REQUIRES_SPLIT_REVIEW` | Inventory marks `INVALID_LOCAL_FILENAME_OR_TIMESTAMP`. It overlaps O3's helpers and organization-members/subscriptions policies; canonical valid-version treatment is required. |
| O8 | `20260620090000_upload_malware_scan_hardening.sql` | `6275909477e72b4ad597717ab028a82015680bdb24aa056e29ebf92f3757dc3e` | `PENDING_DEPLOYMENT` | Hardens controlled-document storage, organization-path constraint and denies direct authenticated object access. Requires documents/storage foundations before rehearsal. |
| O9 | `20260620232000_enterprise_backend_only_rls_explicit_lock.sql` | `8cae79a9aad2a9a78b8cec4673952c8e9eeb40de1f5aef2768a0a6423c9ec05f` | `PENDING_DEPLOYMENT — PREREQUISITE_BLOCKED` | Adds literal backend-only policies for audit/subscription/invitation tables. Treat as later static-evidence hardening after O3/O4/O5. |
| O10 | `20260621090000_stripe_events_processed.sql` | `4532660cd227ff54bd0a20008aa4ecd1759b9ef84a88d2f249e4359d96ae843a` | `REQUIRES_SPLIT_REVIEW` | First `stripe_events_processed` definition conflicts with O11/O15 on status default and `stripe_created_at` nullability; `IF NOT EXISTS` makes final schema order-dependent. |
| O11 | `20260621102000_stripe_events_processed.sql` | `1e4be34fa6f231316f965cbbc1bceada6d6335cabad56724fd67f136c52863c6` | `REQUIRES_SPLIT_REVIEW` | Second definition requires `stripe_created_at NOT NULL`, defaults status to `processing` and backfills from `stripe_webhook_events`; behavior differs if O10 already created the table. |
| O12 | `20260621120000_audit_chain_enterprise_hardening.sql` | `7c250b6c71cf135a367ae9ba7a81614cbb31166f26c270d1199fcfbb7125f2f1` | `PENDING_DEPLOYMENT — PREREQUISITE_BLOCKED` | Replaces chained audit RPC and assumes audit-chain foundations. Block until canonical resolution of earlier duplicate-version audit groups I-DUP-03/I-DUP-04 plus exact table/function evidence. |
| O13 | `20260621143000_upload_security_metadata.sql` | `4a7cb859f628f9a9b81e3dc96bf6b30d90484a66c9284582f2fa41dad0a1441a` | `REQUIRES_SPLIT_REVIEW` | Adds scan columns with `scan_required` nullable. O14 intends `NOT NULL DEFAULT false`; `ADD COLUMN IF NOT EXISTS` means O14 cannot fix O13's existing column contract. |
| O14 | `20260621160000_upload_scan_metadata.sql` | `c4f2dad5ad6d142f507149fc14b17c806fdc9311bc1ed044b136e5fd84b4af44` | `REQUIRES_SPLIT_REVIEW` | Extends O13 with constraints/indexes/JSON evidence but cannot enforce intended `scan_required` contract if O13 ran first. Requires canonical merged final-state treatment. |
| O15 | `20260623090000_stripe_webhook_events_enterprise_runtime.sql` | `0897653ba7023558a7cc1e5139d1444a65d1518170de2f567541de26c513dadd` | `REQUIRES_SPLIT_REVIEW` | Later Stripe runtime hardening creates/alters both ledgers, but `ADD COLUMN IF NOT EXISTS` does not reconcile O10/O11 defaults/nullability. O10/O11/O15 need one canonical final-state decision. |

## Proposed reconciliation groupings

### Compliance metric snapshots

`O1 + O2 → canonical compliance_metric_snapshots final-state review`

Both target the same table with non-equivalent defaults and policies. They must not be treated as independent deployable units until the target schema and RLS policy set are explicitly decided.

### Core multi-tenant RLS

`O3 → O4 → O5 → O6`

with `O7 = REQUIRES_SPLIT_REVIEW`, and `O3/O4/O5 → O9`.

O7 has an invalid migration version and overlaps O3. It must not be renamed, repaired, or executed by this preparation.

O3 creates `public.is_org_member(uuid)`. This is **not** `public.is_organization_member(uuid)` and therefore does not resolve the separate N7/N13 qualified-review blocker.

### Controlled document upload security

`O8 → canonical O13/O14 metadata final-state review`

O13/O14 both add the same scan columns with incompatible effective `scan_required` semantics when applied via `ADD COLUMN IF NOT EXISTS`.

### Stripe webhook/idempotency runtime

`O10 + O11 + O15 → canonical stripe event-ledger final-state review`

The three migrations have divergent definitions/backfill assumptions for `stripe_events_processed` / `stripe_webhook_events`. Their effective result is order-dependent.

### Audit chain

`I-DUP-03/I-DUP-04 canonical resolution → O12`

O12 is not executable until the earlier audit-chain foundation/function lineage is resolved and the required table/function contract is proven.

## What owner approval would change

If the repository owner later explicitly approves this packet, the exact-fingerprint ledger can add each newly approved O-item once. No credit is added by preparing or merging this document alone.

Any owner decision may accept, reject, or change the technical recommendations. The repository must preserve that human decision verbatim and must not infer it from a merge action, branch creation, CI success, or this preparation.

## Explicit safety boundary

This preparation does **not** authorize or perform:

- owner classification;
- independent approval;
- SQL execution;
- migration execution;
- migration-history repair or mutation;
- destructive migration rename or deletion;
- backfill;
- `supabase db push`;
- staging execution;
- production deployment;
- schema mutation;
- data mutation.

`automaticClassificationAllowed = false`  
`ownerDecisionRecorded = false`  
`canonicalDecisionAccepted = false`  
`independentApprovalPresent = false`  
`stagingExecutionAuthorized = false`  
`migrationExecutionAuthorized = false`  
`migrationHistoryMutationAuthorized = false`  
`productionWriteAuthorized = false`
