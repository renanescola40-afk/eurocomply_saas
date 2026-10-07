# RISCK COMPLY — Buyer Materials 100% Closure Matrix

Date: 2026-10-07
Status authority: buyer-material readiness only. This file does not supersede transaction-closing evidence.
Seller: SAMUEL CERQUEIRA, UNIPESSOAL LDA
Product: RISCK COMPLY

## Truth boundary

- Buyer materials may be internally ready while a transaction remains externally incomplete.
- No revenue, customer, certification, pentest, ownership, title, offer, LOI, signature or closing fact may be upgraded beyond evidence.
- Source code, credentials and raw secrets are never share-now materials.
- Buyer-specific sharing remains staged and transaction-controlled.

| Material | Purpose | Canonical file | Buyer stage | Status | Factual gaps | Buyer-specific input required | External dependency | Action | Final status |
|---|---|---|---|---|---|---|---|---|---|
| Corporate acquisition overview | Explain product, architecture and build-vs-buy case | docs/ma/buyer-materials/RISCK_COMPLY_CORPORATE_ACQUISITION_OVERVIEW.md | Initial interest | READY | External assurance and exact production parity remain bounded | None for initial sharing | No | Created from existing trust/sales sources | PASS |
| Financial/commercial factsheet | Answer revenue, recurring revenue, customer and GTM questions | docs/ma/buyer-materials/RISCK_COMPLY_FINANCIAL_COMMERCIAL_FACTSHEET.md | Initial interest / NDA | READY_WITH_BOUNDARIES | Full accounting/tax source pack not yet available | Buyer may request accounting format | Accountant / owner source records | State verified pre-revenue facts and accounting boundary | PASS |
| Product use cases | Explain product value without fake customer case studies | docs/ma/buyer-materials/RISCK_COMPLY_PRODUCT_USE_CASES.md | Initial interest | READY | Named customer deployments not claimed | None | No | Use product-use-case framing only | PASS |
| Team and creator brief | Answer team-size and bio questions | docs/ma/buyer-materials/RISCK_COMPLY_TEAM_AND_CREATOR_BRIEF.md | Initial interest / NDA | READY_WITH_OWNER_PROVIDED_FACTS | Legal creator-to-seller IP chain remains open | Buyer may request detailed CV / KT plan | Legal/title execution | Separate creator role from title status | PASS |
| Buyer M&A FAQ | Handle common objections consistently | docs/ma/buyer-materials/RISCK_COMPLY_BUYER_MA_QA.md | Initial interest / NDA | READY | Some answers remain buyer/counsel dependent | Buyer-specific questions | Buyer / counsel | Consolidated | PASS |
| Transaction perimeter | Define what can be sold and transfer method | docs/ma/buyer-materials/RISCK_COMPLY_TRANSACTION_PERIMETER.md | NDA / diligence | READY_WITH_OPEN_TITLE_ITEMS | IP/domain/provider title/transfer evidence not fully closed | Structure and buyer target accounts | Counsel / providers / owner | Preserve explicit open gaps | PASS |
| Diligence truth pack | Prevent overstatement of technical/security state | docs/ma/buyer-materials/RISCK_COMPLY_DILIGENCE_TRUTH_PACK.md | NDA / diligence | READY | Main-production SHA mismatch; clean independent terminal retest not credited | Buyer diligence requests | Vercel payment / external assurance | Evidence-bound status map | PASS |
| Buyer-specific response packs | Prebuild Banyan, Twilio, ServiceNow and B3 responses | docs/ma/buyer-materials/RISCK_COMPLY_BUYER_SPECIFIC_RESPONSE_PACKS.md | Initial interest | READY | Buyer follow-up questions remain external | Exact buyer questions as received | Buyer | Created | PASS |
| Existing transaction document set | NDA/LOI/term sheet/SPA/APA/disclosure/TSA/closing | docs/ma/FINAL_SALE_READINESS_CONTROL_TOWER.md and docs/ma/MA_TRANSACTION_MASTER_INDEX.md | NDA through closing | INTERNALLY_READY | Signatures, buyer economics, counsel/tax inputs not executed | Yes | Buyer/counsel/accountant | Reference, do not duplicate | PASS_INTERNAL |
| Data-room staged index | Control what is shared when | docs/trust/BUYER_DATA_ROOM_100_MASTER_INVENTORY_2026-09-28.md | All stages | INTERNALLY_READY | External evidence still open | Transaction stage | External dependencies | Reference | PASS_INTERNAL |
| Security / architecture pack | Technical diligence | docs/trust/SECURITY_OVERVIEW.md; docs/trust/ARCHITECTURE_OVERVIEW.md; docs/security/* | NDA / diligence | INTERNALLY_READY | Terminal independent assurance open | Buyer questionnaire scope | External pentest/retest | Reference | PASS_INTERNAL |
| IP/software diligence | Chain, OSS, SBOM, transfer evidence | docs/trust/M_AND_A_IP_SOFTWARE_DILIGENCE_INDEX.md; docs/ma-diligence/* | Diligence | READY_WITH_GAPS | Creator-to-seller executed title instrument not identified | Transaction structure | Counsel/owner/signature | Disclose gap | PASS_INTERNAL |

## Buyer-stage readiness

- BUYER_INITIAL_RESPONSE_READINESS: PASS
- BUYER_NDA_READINESS: PASS
- BUYER_DATA_ROOM_READINESS: PASS
- BUYER_TECH_DILIGENCE_READINESS: PASS_WITH_DISCLOSED_EXTERNAL_GAPS
- BUYER_COMMERCIAL_DILIGENCE_READINESS: PASS_WITH_ACCOUNTING_BOUNDARY
- BUYER_FINANCIAL_DILIGENCE_READINESS: PARTIAL — source accounting/tax records remain external
- BUYER_IP_DILIGENCE_READINESS: PARTIAL — creator-to-seller chain/title execution remains open
- BUYER_SIGNING_READINESS: NO_PASS
- BUYER_CLOSING_READINESS: NO_PASS

## Current buyer pipeline classification

- Banyan Software / Mathew Sciarra: TIER_2_HUMAN_INTEREST — requested revenue/recurring revenue, customer count/types, team size, business/customer location.
- Twilio / Joel Just: TIER_2_HUMAN_INTEREST — requested summary overview, financial metrics, customer use cases and team bios.
- ServiceNow: TIER_1_ROUTED — forwarded to Corporate Development; no substantive acquisition interest yet credited.
- B3: TIER_1_ROUTED — forwarded to responsible team; no substantive acquisition interest yet credited.

No NDA, diligence process, offer, LOI, signing or closing is credited solely from these responses.

## Internal closure result

BUYER_MATERIALS_INTERNAL_CLOSURE=100_PERCENT

This means all internally controllable current-stage buyer-facing material required by the master instruction exists or is referenced canonically. It does not mean TRANSACTION_100_PERCENT.
