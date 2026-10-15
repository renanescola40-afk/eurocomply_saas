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


## V2 audit addendum — 2026-10-15
| Material needed | Canonical source | Evidence state | Disclosure decision |
|---|---|---|---|
| Frozen source provenance | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/PROVENANCE_REGISTER_V2_2026-10-15.md` | Exact baseline and selected blob IDs verified; external title NOT proved | INTERNAL / HOLD |
| Technical/assurance handoff | `DATAGUARD_DATA_ROOM/15_EVIDENCE_MANIFEST/CROSS_EXECUTOR_HANDOVER_REGISTER_V2_2026-10-15.md` | Source docs present; externally accepted proof OPEN | INTERNAL / HOLD |
| Runtime exact-SHA parity | `docs/assurance/iso27001-soc2/exact-sha-production-drift-2026-10-15.md` | Dated snapshot documents 108-commit divergence; no new live proof | RESTRICTED_LATE_STAGE / HOLD |
| Independent security retest | `docs/security/dataguard/EXTERNAL_ASSURANCE_RECONCILIATION_V1_4.md` | Historical limited external assessment; terminal clean report unaccepted | RESTRICTED_LATE_STAGE / HOLD |
| Controlled buyer sharing | `DATAGUARD_DATA_ROOM/00_EXECUTIVE_INDEX/BUYER_CONTROLLED_SHARING_PACK_V2_2026-10-15.md` | Candidate list only; never released | INTERNAL / HOLD |

These rows update documentation cross-references, not the 2026-10-08 M&A evidence numerator or buyer release status.
