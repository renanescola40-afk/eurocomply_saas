# Buyer Document Availability and Disclosure Matrix
Checked: 2026-10-14 | Reviewer: autonomous documentary controller
Scope: specific repository files inspected or cited, **not** full legal/operational attestation.

| Buyer request | Canonical source | Documentary classification | Disclosure |
|---|---|---|---|
| Product overview | docs/sales/one-pager.md | VERIFIED_COMPLETE: file content inspected | INITIAL_REVIEW / approval |
| Architecture | docs/trust/ARCHITECTURE_OVERVIEW.md | PARTIAL: file reachable; deployment parity open | NDA_REQUIRED for detail |
| Application security | docs/trust/SECURITY_OVERVIEW.md | IMPLEMENTED_NOT_RUNTIME_VERIFIED | Controlled qualified summary |
| RLS / access | docs/trust/ACCESS_CONTROL.md; docs/security/SUPABASE_TENANT_ISOLATION_IMPLEMENTATION.md | IMPLEMENTED_NOT_RUNTIME_VERIFIED | RESTRICTED_LATE_STAGE |
| Pricing | config/billing-commercial-catalog.json | PARTIAL: referenced by index; live billing reconciliation open | INITIAL_REVIEW / approval |
| Corporate authority | docs/ma-diligence/SELLER_DATA_ROOM_MASTER_SCORECARD.md | PARTIAL: official records open | NDA_REQUIRED |
| Seller IP assignment | docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md, item 22 | MISSING: executed assignment not credited | RESTRICTED_LATE_STAGE |
| Financial reports | same, items 38–63 | PARTIAL / MISSING depending item | NDA_REQUIRED |
| Tax clearance | same, items 64–75 | EXTERNAL_DEPENDENCY | NDA_REQUIRED |
| Provider change of control | docs/ma-diligence/PROVIDER_TRANSFER_MATRIX.md | PARTIAL: transfer execution open | RESTRICTED_LATE_STAGE |
| Independent security assurance | docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md | EXTERNAL_DEPENDENCY: clean terminal retest open | RESTRICTED_LATE_STAGE |
| Runtime release parity | DATAGUARD_DATA_ROOM/10_RUNTIME_EVIDENCE/RUNTIME_EVIDENCE_REQUEST.md | MISSING: current environment pairing | RESTRICTED_LATE_STAGE |
| Handover steps | DATAGUARD_DATA_ROOM/13_HANDOVER_PLAN/TECHNICAL_HANDOVER_INDEX.md | PARTIAL: draft pending operational approval | RESTRICTED_LATE_STAGE |

Classification VERIFIED_COMPLETE here applies only to specified **documentary existence/content**, never proof of transaction closing or certification. No data room link is buyer-disclosed by creation alone.
