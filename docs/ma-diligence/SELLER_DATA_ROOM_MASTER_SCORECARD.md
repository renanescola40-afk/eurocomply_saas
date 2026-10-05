# RISCK COMPLY — Seller Data Room Master Scorecard

Date: 2026-10-05  
Baseline main SHA: `6219f52c463c367848c1139158e5389d35298ca2`  
Seller: SAMUEL CERQUEIRA, UNIPESSOAL LDA  
Purpose: full-sale M&A diligence readiness  
Status: `INTERNAL_DOCUMENT_READINESS=100 / OVERALL_TRANSACTION_READINESS=NOT_100`

## Scoring method

The prior management percentages have been superseded by the reproducible 98-item scoring matrix at:

- `docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md`

Each original requirement is scored `CLOSED=1.0`, `PARTIAL=0.5`, or `OPEN=0.0`. Templates alone do not earn external-evidence credit. Every numerator and denominator is listed in that matrix.

## Current scores

| Measure | Score | Meaning |
|---|---:|---|
| INTERNAL_DOCUMENT_READINESS | **100%** | The reusable diligence documentation/control package is internally complete. |
| AUDITABLE_MA_EVIDENCE_CLOSURE | **35.71%** | 35.0 evidence points closed out of the original 98 requirements using the published scoring rule. |
| AUDITABLE_MA_EVIDENCE_REMAINING | **64.29%** | Official, IP-title, accounting, tax, commercial-fact and provider account/closing evidence still open or partial. |

```text
TOTAL_EVIDENCE_POINTS=35.0
TOTAL_REQUIREMENTS=98
AUDITABLE_MA_EVIDENCE_CLOSURE=35.71%
AUDITABLE_MA_EVIDENCE_REMAINING=64.29%
INTERNAL_DOCUMENT_READINESS=100%
MANDATORY_INTERNAL_DOCUMENT_BLOCKERS=0
```

The auditable evidence score is recalculable line by line. Commercial evidence added on 2026-10-05 moved pipeline, outreach metrics and current buyer signals to CLOSED while preserving strict non-claims for customers, LOIs, active pilots and acquisition offers.

## Newly closed in this continuation

- Requirement 44 (Operating costs) reconciled from OPEN → PARTIAL because four provider-originated Google invoices totaling €57.46 were already credited in the Financial Fact Book.
- Contributor-history review expanded from 300 commits to more than 18,000 commits.
- Legacy identities `renansilva2002-tech` and `soltomstorevendas-web` are now explicitly tracked rather than silently omitted.
- No employee/contractor/legal-owner relationship is inferred from Git identities alone.

## Earlier corporate/provider closure

- Corporate legal-name string independently corroborated by authenticated Stripe LIVE company evidence; requirement 2 moved PARTIAL → CLOSED while registry extract remains separately open.
- Company-address evidence obtained from authenticated Stripe LIVE; requirement 4 moved OPEN → PARTIAL without exposing the address in this public-repo-safe scorecard.
- Vercel authenticated Pro-team/project/repo/domain control confirmed; official project transfer capability documented.
- Supabase authenticated Pro organization and ACTIVE_HEALTHY production project in eu-west-1 confirmed; official project-transfer capability documented.
- Human Upstash support evidence confirms DPA incorporation, contracting entity model and SCC/DPF transfer framework; account billing profile remains open.

## Earlier Stripe financial closure

- Stripe LIVE account directly reconciled through the provider API.
- Stripe LIVE customer objects: 0.
- Stripe LIVE subscription objects: 0.
- Stripe LIVE charges: 0.
- Stripe LIVE invoices: 0.
- Stripe LIVE EUR available/pending balance: €0 / €0.
- Revenue history, MRR, ARR, customer count and cash position moved from OPEN to PARTIAL, strictly limited to what Stripe can prove.
- Total company revenue/cash remains accounting and bank-evidence dependent.

## Commercial evidence already closed

- Commercial pipeline register created from connected mailbox evidence.
- 352 unique sent outreach messages reconciled across the defined acquisition + pilot/procurement scope.
- 22 delivery-failure messages separately tracked.
- B3 routing to responsible team, ServiceNow routing to Corporate Development and BPI pilot-proposal analysis are now attributable buyer signals.
- No LOI, active pilot, customer, revenue or acquisition offer was inferred.

## Earlier evidence improvements

- 300-commit contributor sample reconciled: 220 primary account, 77 automation/commit account, 3 Dependabot.
- No additional human contributor identity appeared in that sample.
- PostHog DPA completion independently verified from corporate mailbox evidence.
- Stripe live account identity strengthened by direct Stripe corporate-mail evidence.
- Candidate company NIPC preserved as a lookup aid but kept unverified until official registry evidence.
- Four Google provider invoices credited as primary bounded cost evidence (€57.46 total), moving operating-cost evidence from OPEN to PARTIAL without claiming a complete OPEX or tax position.
- Current buyer signals credited as PARTIAL from attributable human responses: B3 forwarded to its responsible team, ServiceNow forwarded to Corporate Development, and Devo indicated a possible later timing. No LOI/offer/commitment is inferred.

## What is complete

- Corporate diligence structure and authority checklist.
- IP ownership/title-chain map and contributor investigation path.
- IP assignment remediation template (unexecuted).
- OSS/license evidence linkage, including known LGPL review item.
- Financial fact-book structure, pre-revenue disclosure template and buyer Q&A.
- Tax diligence question set for asset sale, share sale, Brazil, US and EU buyer scenarios.
- Provider transfer/handover matrix with evidence-bound account facts.
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
PROVIDER_TRANSFER_TERMS_REVIEW=CLOSED
PROVIDER_ACCOUNT_EXECUTION_OPEN=YES
OVERALL_TRANSACTION_100=NO
EXACT_PERCENT_COMPLETE=35.71
EXACT_PERCENT_REMAINING=64.29
```

## Priority closure order

1. Close **IP_CHAIN_GAP** before making unqualified seller ownership representations.
2. Acquire registry/articles/RCBE/NIPC/registered-office/signatory evidence.
3. Confirm current CAE/software activity status and reconcile official records.
4. Obtain AT tax-clearance + VAT/VIES evidence.
5. Build accountant-backed financial pack through transaction cut-off.
6. Export domain/provider account-control evidence and transfer plans.
7. Refresh OSS/SBOM and full contributor register on the final transaction SHA.
8. Have counsel/accountant approve transaction-specific conclusions.
