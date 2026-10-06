# RISCK COMPLY — Final Sale Readiness Control Tower

Date: 2026-10-06  
Product: RISCK COMPLY  
Seller: SAMUEL CERQUEIRA, UNIPESSOAL LDA  
Repository: renanescola40-afk/eurocomply_saas  
Transaction scope: sale of 100% of RISCK COMPLY or associated software/IP assets to a strategic acquirer  
Canonical status: `FINAL_MA_GO=NO_PASS`

## 1. Truth rules

- This file is the canonical sale-readiness authority for the current M&A state.
- `DRAFT_READY` never means counsel-approved, buyer-accepted, signed or legally effective.
- `EXECUTED` is forbidden unless actual execution evidence exists.
- Templates are never used as proof of external facts.
- Routing/autoreplies are never promoted to buyer interest.
- No source code is automatically shareable.
- No provider account is called transferable where official provider evidence supports only owner/admin handover, project transfer, domain claim, or buyer-created replacement/migration.
- External blockers remain external; they are not hidden behind optimistic internal percentages.

## 2. Current technical baseline

Repository latest observed main commit:
`11fa0ddf024e7449c3eed9ffe551afed384618d9`

Latest observed Vercel Production deployment:
- deployment: `dpl_HU23LxLg8KtCtTeNrL7n3JgrQFqP`
- state: `READY`
- target: `production`
- GitHub SHA: `def7bad00e082ce336734ff7658846fe87595c79`

Result:
`MAIN_PRODUCTION_SHA_EQUALITY=FAIL`

Vercel project/account evidence:
- project: `prj_APpXAyQFy1Gie50xfbO45zjkyUSm`
- team: `team_wu3LZI6ReFxO16xipv73GLwG`
- connected team has one observed `OWNER`
- `risckcomply.com` and `www.risckcomply.com` are verified project domains
- this proves current operational control, not registrar title ownership

Supabase production evidence:
- project: `tganhbbhfxcpblmgqprg`
- organization: `jdtqfjdqljeqgitvgnea`
- state: `ACTIVE_HEALTHY`
- region: `eu-west-1`

## 3. Canonical source set

### Transaction documents
- `docs/ma/MA_TRANSACTION_MASTER_INDEX.md`
- `docs/ma/MA_65_ITEM_COVERAGE_MATRIX.md`
- `docs/ma/MA_DOCUMENT_STATUS_SCORECARD.md`
- `docs/ma/closing/SIGNING_CLOSING_MASTER_CHECKLIST.md`
- `docs/ma/closing/TRANSFER_SCHEDULES.md`

### Corporate / IP / financial / tax diligence
- `docs/ma-diligence/SELLER_DATA_ROOM_MASTER_SCORECARD.md`
- `docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md`
- `docs/ma-diligence/PROVIDER_TRANSFER_MATRIX.md`
- `docs/ma-diligence/PROVIDER_TRANSFER_CHANGE_OF_CONTROL_REVIEW_2026-10-05.md`
- `docs/ma-diligence/COMMERCIAL_PIPELINE_EVIDENCE_REGISTER.md`

### Security / technical diligence
- `docs/trust/M_AND_A_IP_SOFTWARE_DILIGENCE_INDEX.md`
- `docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md`
- `docs/trust/BUYER_DATA_ROOM_100_MASTER_INVENTORY_2026-09-28.md`
- `docs/trust/PROVIDER_FACTUAL_EVIDENCE_REGISTER.md`
- `docs/security/P1_SBOM_ATTESTATION_CI.md`
- current DR/security evidence under `docs/dr/`, `docs/security/`, and `docs/trust/evidence/`

## 4. Internal transaction-document state

```text
TRANSACTION_DOCS_INTERNAL_PERCENT=100
MANDATORY_SCOPE_COVERAGE=65/65
MANDATORY_INTERNAL_DOCUMENT_BLOCKERS=0
EXECUTED_DOCUMENT_COUNT=0
```

The pack includes, at minimum:
- NDA pack
- LOI / term sheet
- SPA
- APA
- disclosure letter and schedules
- warranties / indemnities / liability-cap architecture
- TSA
- knowledge-transfer agreement
- software/IP/domain/brand/source-code/cloud transfer schedules
- signing checklist
- closing checklist
- funds-flow template
- signatory matrix
- board/member approval template
- buyer-counsel Q&A
- Portugal/EU/US/Brazil jurisdiction and tax issue checklists

## 5. Staged buyer data room

### STAGE_1_INITIAL_INTEREST
SHARE_NOW:
- buyer deck / teaser approved for external use
- high-level product and architecture overview
- public trust/security material
- non-confidential transaction perimeter
- high-level readiness statement with explicit external-gap caveat

DO_NOT_SHARE:
- source code
- credentials/secrets
- raw provider invoices
- bank/tax records
- private contributor/title evidence
- detailed vulnerability material
- unredacted internal legal drafts

### STAGE_2_NDA
SHARE_AFTER_NDA:
- NDA-governed technical overview
- seller data-room index
- security and privacy evidence indexes
- high-level SBOM/OSS summary
- provider inventory and transfer approach
- corporate/IP/financial/tax request lists
- transaction-document index

### STAGE_3_DILIGENCE
SHARE_ONLY_DURING_DILIGENCE:
- detailed SBOM/OSS evidence
- RLS/RBAC/tenant-isolation evidence
- DR/recovery evidence
- provider account evidence
- contributor/IP chain materials
- corporate registry/RCBE/CAE/tax evidence when obtained
- management accounts/bank/accounting evidence when obtained
- detailed disclosure schedules
- pentest report/retest when independently completed

SOURCE_CODE:
- never auto-share
- only after explicit transaction-specific approval, NDA, need-to-know controls, access logging, and an agreed source-review method

### STAGE_4_TRANSACTION
- LOI / term sheet negotiation set
- SPA or APA
- disclosure letter
- negotiated schedules
- warranties/indemnities
- tax/counsel issue lists

### STAGE_5_SIGNING
- final execution copies
- signatory/authority evidence
- approvals/resolutions
- conditions-precedent status
- final funds-flow mechanics

### STAGE_6_CLOSING
- executed transfer documents
- provider handoff instructions
- domain/project/repository migration steps
- secret rotation plan
- payment/funds-flow evidence
- buyer acceptance evidence

### STAGE_7_POST_CLOSE
- TSA / knowledge-transfer execution
- seller-access removal
- credential rotation completion
- post-close migration checks
- residual data deletion/retention actions
- final handover/acceptance log

## 6. Transaction-document validation

| Document | Current state |
|---|---|
| NDA | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED / SIGNATURE_REQUIRED |
| LOI | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED / SIGNATURE_REQUIRED |
| Term sheet | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED |
| SPA | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED / TAX_REVIEW_REQUIRED / SIGNATURE_REQUIRED |
| APA | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED / TAX_REVIEW_REQUIRED / SIGNATURE_REQUIRED |
| Disclosure letter | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED / SIGNATURE_REQUIRED |
| Disclosure schedules | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED |
| Warranties | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED |
| Indemnities | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED |
| Liability caps | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED |
| TSA | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED / SIGNATURE_REQUIRED |
| Knowledge transfer | DRAFT_READY / BUYER_INPUT_REQUIRED / COUNSEL_REVIEW_REQUIRED / SIGNATURE_REQUIRED |
| Transfer schedules | DRAFT_READY / BUYER_INPUT_REQUIRED / PROVIDER_ACTION_REQUIRED_AT_CLOSING |
| Signing checklist | DRAFT_READY |
| Closing checklist | DRAFT_READY |
| Funds flow | DRAFT_READY / BUYER_INPUT_REQUIRED / TAX_REVIEW_REQUIRED |
| Signatory matrix | DRAFT_READY / OFFICIAL_AUTHORITY_EVIDENCE_REQUIRED |
| Board/member approval template | DRAFT_READY / COUNSEL_REVIEW_REQUIRED / SIGNATURE_REQUIRED |
| Buyer counsel Q&A | DRAFT_READY |
| Jurisdiction checklists | DRAFT_READY / COUNSEL_REVIEW_REQUIRED / TAX_REVIEW_REQUIRED |

`EXECUTED=0` across the transaction document set unless actual evidence is subsequently added.

## 7. Provider transferability control

| Provider | Current evidence | Transfer/handoff truth | Current M&A state | Closing action |
|---|---|---|---|---|
| Vercel | authenticated team/project/domain control; official project/team transfer mechanisms documented | project/team ownership can be handed over/transferred subject to provider limitations | PARTIAL | buyer owner/admin, billing reconciliation, project/domain transfer as appropriate, integrations/secrets review |
| Supabase | authenticated org and ACTIVE_HEALTHY production project | official project transfer is documented subject to prerequisites/blockers | PARTIAL | clear transfer blockers, buyer target org/member, transfer project, revalidate auth/storage/functions/billing |
| Stripe | authenticated LIVE account evidence already reconciled | provider-assisted ownership/business-sale transfer exists; legal-entity/country changes may require support | PARTIAL | buyer/entity-specific owner/legal/tax/bank update path |
| Google | runtime/OAuth/cloud usage documented | project/IAM/org/billing migration path exists; not a blanket account transfer claim | PARTIAL | IAM/org-policy/billing handoff and callback/credential reconciliation |
| GitHub | repository control and official repository/org transfer mechanisms documented | repository can transfer; org ownership/billing/features require separate verification | PARTIAL | transfer to buyer-controlled org/account and revalidate protections/actions/secrets |
| Sentry | provider use and owner-role handoff mechanism documented | owner-role transition is available; account-specific billing/legal identity still open | PARTIAL | buyer owner role, billing/legal reconciliation, final seller removal |
| Upstash Redis | provider use, team roles and database move-to-team mechanism documented | database move is supported; original team-owner identity is not assumed transferable | PARTIAL | buyer team, database move, billing/DPA/secret rotation |
| Resend | DPA/SCC evidence and Domain Claim mechanism documented | domain claim/re-verification may require support; API keys should be recreated | PARTIAL | buyer team/domain claim, support if needed, credential rotation |
| PostHog / other live provider | provider/DPA evidence exists where documented | project move or buyer-account migration depends on provider/account specifics | PARTIAL | buyer-target org/account, billing/region/data reconciliation |
| Domain registrar | project-domain operational control exists; registrar title proof not yet credited | transfer cannot be declared until registrar evidence is available | PARTIAL/OPEN | obtain registrar title/control evidence and execute buyer transfer only at closing |

Current provider score remains:
`PROVIDER_PERCENT=50.00%`

No provider is marked transferred or closing-complete.

## 8. Current auditable 98-item M&A score

The canonical reproducible scoring remains:

```text
CORPORATE=5.0/17=29.41%
IP=14.0/20=70.00%
FINANCIAL=6.0/26=23.08%
TAX=0.0/12=0.00%
COMMERCIAL=6.5/15=43.33%
PROVIDERS=4.0/8=50.00%

TOTAL_SCORE=35.5
TOTAL_REQUIREMENTS=98
AUDITABLE_MA_EVIDENCE_PERCENT=36.22%
REMAINING_AUDITABLE_MA_EVIDENCE_PERCENT=63.78%
INTERNAL_DOCUMENT_READINESS_PERCENT=100%
```

This score is unchanged by this control-tower consolidation because no template, live Vercel/Supabase operational observation, or provider mechanism is being misused as proof of official corporate, tax, IP-title, financial, buyer, signature, or transfer execution facts.

## 9. Buyer pipeline classification

Canonical mailbox evidence currently supports:
- `TOTAL_OUTREACH=352` unique sent messages across the defined acquisition + pilot/procurement scope
- `DELIVERY_FAILURE_MESSAGES=22`
- B3: routed to responsible team
- ServiceNow: routed to Corporate Development
- BPI: pilot proposal under analysis
- Devo: human response confirms the request belongs to another department and indicates timing may be better in approximately three months; this is a timing/routing signal, not current acquisition interest

Strict stage interpretation:
- delivery/autoreply/routing does not equal acquisition interest
- no executed NDA is credited
- no active diligence process is credited
- no acquisition offer is credited
- no executed LOI/term sheet is credited
- no signing/closing is credited

Therefore:
```text
REAL_BUYER_INTEREST=NOT_YET_CREDITED_AS_TIER_2_UNLESS_A_HUMAN_RESPONSE_EXPRESSES_SUBSTANTIVE_ACQUISITION_INTEREST
NDAS=0_CREDITED
DILIGENCE_PROCESSES=0_CREDITED
OFFERS=0_CREDITED
LOIS=0_CREDITED
SIGNED_TRANSACTION=0
CLOSED_TRANSACTION=0
```

## 10. Security and technical buyer-diligence summary

Positive evidence:
- current main commit identified
- Vercel Production is READY
- current production deployment SHA is attributable
- fresh SBOM is closed with provenance evidence
- OSS/license inventory and copyleft review exist
- RLS / tenant-isolation / RBAC evidence exists in the enterprise/security pack
- Stripe LIVE account and billing evidence has been reconciled for diligence
- DR/recovery evidence exists and current database FK findings are classified with `UNCLASSIFIED_FKS=0`

Open/partial evidence:
- current main and Production SHA are not equal
- independent pentest/retest is not credited as PASS
- final provider account-owner/billing-owner/closing-transfer evidence is incomplete
- closing-time credential rotation and buyer acceptance are not executed
- current storage/recovery evidence should remain tied to the latest accepted artifact/release rather than generalized beyond its proof

Conservative 10-gate M&A security mini-score:
- current main identified: 1
- Production deployment READY: 1
- exact main=Production: 0
- SBOM: 1
- OSS/license diligence: 1
- RLS/tenant isolation: 1
- RBAC/governance: 1
- billing/Stripe diligence: 0.5
- DR/recovery: 0.5
- independent pentest/retest: 0

`SECURITY_DILIGENCE_PERCENT=70.00%`

This is an M&A diligence control score, not a product-security certification.

## 11. Final sale gates

| Gate | Result | Reason |
|---|---|---|
| READY_FOR_OUTREACH | PASS | external-ready buyer materials and outreach process exist |
| READY_FOR_NDA | PASS | NDA pack exists and is internally ready |
| READY_FOR_DATA_ROOM | PASS | staged data-room architecture and evidence indexes exist |
| READY_FOR_BUYER_DILIGENCE | PASS | diligence package can be opened with gaps truthfully disclosed |
| READY_FOR_LOI | PASS | LOI/term-sheet pack is internally ready; buyer-specific economics remain required |
| READY_FOR_SIGNING | NO_PASS | official corporate authority, IP title, tax/accounting/counsel and buyer-specific negotiated documents remain open |
| READY_FOR_CLOSING | NO_PASS | no executed transaction, funds flow, provider transfer, domain/IP transfer, signatures or buyer acceptance exists |

## 12. Remaining blocker ownership

### OWNER_ACTION
- provide/obtain authoritative company records when available
- provide registrar/domain title evidence
- provide source financial/bank/accounting records
- execute any required IP assignment/confirmatory assignment only after legal review
- approve any transaction-specific sharing of source code
- approve/sign transaction documents only when final

### ACCOUNTANT_ACTION
- P&L, balance sheet, cash flow, trial balance, management accounts
- cash/debt/A-R/A-P/OPEX reconciliation
- VAT/CIT/payroll/withholding status
- transaction tax modelling

### LAWYER_ACTION
- creator-to-seller IP chain/title sufficiency
- encumbrances/disputes confirmation
- seller authority/approvals/signing mechanics
- share-vs-asset structure
- negotiated warranties/indemnities/liability
- jurisdiction/enforceability issues

### TAX_AUTHORITY_ACTION
- current official tax-clearance/status artifacts where required

### BUYER_ACTION
- legal entity/signatory details
- NDA/LOI/term sheet input
- diligence questions
- price/structure
- definitive agreement negotiations
- closing acceptance

### PROVIDER_ACTION
- account/project/domain migration approvals/support where provider-specific
- billing/legal identity changes
- transfer/change-of-control execution

### EXTERNAL_PENTEST_ACTION
- independent test/retest report and acceptance evidence

### NO_INTERNAL_ACTION_POSSIBLE
- executed buyer interest/LOI/offer/signature/closing facts before they actually occur
- external authority/provider/counsel/accountant attestations before issuance

## 13. Final current percentages

```text
INTERNAL_DOCUMENT_READINESS_PERCENT=100.00%
AUDITABLE_MA_EVIDENCE_PERCENT=36.22%
CORPORATE_PERCENT=29.41%
IP_PERCENT=70.00%
FINANCIAL_PERCENT=23.08%
TAX_PERCENT=0.00%
COMMERCIAL_PERCENT=43.33%
PROVIDER_PERCENT=50.00%
SECURITY_DILIGENCE_PERCENT=70.00%

SALE_READINESS_PERCENT=36.22%
REMAINING_PERCENT=63.78%

FINAL_MA_GO=NO_PASS
```

`SALE_READINESS_PERCENT` is deliberately aligned to the reproducible 98-item auditable evidence score, not to the 100% internal-document score.

## 14. Current conclusion

The internal M&A documentation architecture is closed at 100%. The transaction is ready for outreach, NDA, staged data-room access, buyer diligence and LOI-level engagement.

It is not ready for signing or closing because corporate authority evidence, IP title execution, accounting/tax evidence, independent pentest evidence, buyer-specific transaction facts, provider closing execution, signatures, funds flow and buyer acceptance remain incomplete.

No internal documentation blocker is being concealed. The remaining gap is primarily authoritative/external evidence and actual transaction execution.
