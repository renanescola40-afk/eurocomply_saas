# RISCK COMPLY — Seller Data Room Master Scorecard

Date: 2026-10-05  
Baseline main SHA: `6219f52c463c367848c1139158e5389d35298ca2`  
Seller: SAMUEL CERQUEIRA, UNIPESSOAL LDA  
Purpose: full-sale M&A diligence readiness  
Status: `INTERNAL_DOCUMENT_READINESS=100 / OVERALL_TRANSACTION_READINESS=NOT_100`

## Scoring method

These are evidence-management scores, not legal/accounting opinions.

- **Internal Document Readiness**: whether the required internal indexes, fact books, request lists and remediation templates exist and truthfully preserve gaps.
- **Official Evidence Readiness**: seller-specific registry/tax/bank/official artifacts actually credited.
- **IP Chain Readiness**: title chain from creator/contributors to seller plus domain/brand/software evidence.
- **Financial Readiness**: buyer-grade financial source records and reconciliations available.
- **Tax Readiness**: tax status evidence plus accountant/counsel transaction analysis.
- **Provider Transfer Readiness**: active provider inventory, account ownership and transfer/change-of-control/handover evidence.

A partial item receives half credit only when substantive evidence exists. A template alone does not count as official evidence.

## Score

| Domain | Score | Why |
|---|---:|---|
| INTERNAL_DOCUMENT_READINESS | **100%** | All seven requested M&A diligence control documents are created with status boundaries, checklists and remediation paths. |
| OFFICIAL_EVIDENCE_READINESS | **0%** | No seller-specific official registry, RCBE, AT, VIES, bank or trademark artifact is credited by this pack. |
| IP_CHAIN_READINESS | **25%** | Repository/source existence and OSS diligence are strong; creator-to-seller assignment, contributor chain, registrar title and brand title remain unproven. |
| FINANCIAL_READINESS | **20%** | Structure/question set is complete, but current P&L, balance sheet, cash flow, bank, GL, revenue/customer and working-capital evidence is not credited. |
| TAX_READINESS | **20%** | Tax checklist is complete, but VAT/VIES/tax-clearance/returns and transaction tax analysis remain external/current-fact dependent. |
| PROVIDER_TRANSFER_READINESS | **65%** | Provider/runtime/DPA inventory is advanced; account ownership, billing, transferability/change-of-control and buyer handover remain incomplete. |

### Overall evidence-weighted readiness

Simple equal-weight management average across the six required score domains:

```text
(100 + 0 + 25 + 20 + 20 + 65) / 6 = 38.33%
EXACT_PERCENT_COMPLETE=38.33%
EXACT_PERCENT_REMAINING=61.67%
```

This is **not** a statement that the transaction is 38.33% legally complete. It is a transparent diligence-control score.

## What is complete

- Corporate diligence structure and authority checklist.
- IP ownership/title-chain map.
- IP assignment remediation template (unexecuted).
- OSS/license evidence linkage, including known LGPL review item.
- Financial fact-book structure, pre-revenue disclosure template and buyer Q&A.
- Tax diligence question set for asset sale, share sale, Brazil, US and EU buyer scenarios.
- Provider transfer/handover matrix.
- Official document acquisition list.
- Master data-room scorecard and truth boundary.

## What requires official documents

- commercial registry certificate;
- current articles;
- NIPC/registered office/managers/CAE evidence;
- RCBE proof;
- AT tax-clearance certificate;
- VIES validation;
- VAT/activity evidence;
- annual accounts/IES;
- bank statements;
- registrar proof;
- trademark/filing evidence if claimed;
- signatory authority evidence.

## What requires accountant

- current revenue/pre-revenue confirmation;
- P&L, balance sheet, cash flow, trial balance and management accounts;
- VAT/CIT/payroll/withholding reconciliation;
- A/R, A/P, debt, cash and tax exposures;
- transaction tax modelling and purchase-price allocation support.

## What requires lawyer

- asset sale vs share sale structure;
- creator/contributor IP chain and assignment sufficiency;
- corporate approvals/signing mechanics;
- encumbrance/dispute disclosure;
- OSS license compatibility opinion if buyer requests;
- representations/warranties/indemnities;
- cross-border transaction/tax legal questions with tax counsel.

## What requires owner signature

- any IP assignment or confirmatory assignment;
- board/shareholder resolution where applicable;
- transaction documents;
- disclosure schedules/representations;
- powers of attorney where applicable.

## What requires provider

- registrar domain ownership/control proof;
- provider account owner and billing owner;
- transfer/change-of-control terms;
- project/account migration or buyer-admin handover paths;
- current invoices/contracts/DPA acceptance where buyer requests them.

## Mandatory blockers

```text
MANDATORY_INTERNAL_BLOCKERS=0
INTERNAL_DOCUMENT_READINESS=100
OFFICIAL_EVIDENCE_READINESS=0
IP_CHAIN_GAP_PRESENT=YES
FINANCIAL_SOURCE_RECORDS_OPEN=YES
TAX_SOURCE_RECORDS_OPEN=YES
PROVIDER_TRANSFER_CLOSURE_OPEN=YES
OVERALL_TRANSACTION_100=NO
```

## Priority closure order

1. Close **IP_CHAIN_GAP** before making unqualified seller ownership representations.
2. Acquire registry/articles/RCBE/NIPC/registered-office/signatory evidence.
3. Confirm current CAE/software activity status and reconcile official records.
4. Obtain AT tax-clearance + VAT/VIES evidence.
5. Build accountant-backed financial pack through transaction cut-off.
6. Export domain/provider account-control evidence and transfer plans.
7. Refresh OSS/SBOM and contributor register on the final transaction SHA.
8. Have counsel/accountant approve transaction-specific conclusions.
