# RISCK COMPLY — Seller Data Room Master Scorecard

Date: 2026-10-05  
Baseline main SHA: `6219f52c463c367848c1139158e5389d35298ca2`  
Seller: SAMUEL CERQUEIRA, UNIPESSOAL LDA  
Purpose: full-sale M&A diligence readiness  
Status: `INTERNAL_DOCUMENT_READINESS=100 / OVERALL_TRANSACTION_READINESS=NOT_100`

## Scoring method

These are evidence-management scores, not legal/accounting opinions. The score is now reproducible from explicit denominators. Templates and question sets do **not** earn source-evidence credit.

### Domain denominators

| Domain | Auditable denominator | Credit rule | Current credit |
|---|---:|---|---:|
| Internal document readiness | 8 required M&A diligence artifacts in this pack | 1 point when artifact exists and preserves truth boundaries | 8/8 |
| Official evidence readiness | 17 external/official evidence items in `OFFICIAL_DOCUMENT_REQUEST_LIST.md` | 1 point only when seller-specific attributable evidence is actually credited | 0/17 |
| IP chain readiness | 10 closing controls listed below | 1 point only when closing control is proven | 3/10 |
| Financial readiness | 10 buyer-grade source-record groups listed below | 1 point only when current cut-off records are credited | 0/10 |
| Tax readiness | 10 current tax evidence/conclusion groups listed below | 1 point only when current authoritative/adviser evidence is credited | 0/10 |
| Provider transfer readiness | 11 active/material providers × 4 controls = 44 | 1 complete, 0.5 substantive partial, 0 open | 23/44 |

### IP chain denominator — 3/10

PASS:
1. primary repository/source-history evidence;
2. OSS/SBOM/license inventory;
3. source-access/release-governance evidence.

OPEN:
4. executed creator→seller transfer;
5. full contributor relationship/title chain;
6. employee/contractor IP agreements or valid N/A;
7. registrar title/control proof;
8. brand/trademark title evidence or explicit unregistered-mark position;
9. encumbrance/prior-grant disclosure;
10. transaction-counsel title sufficiency review.

### Financial denominator — 0/10

Required current cut-off source groups:
1. revenue/customer reconciliation;
2. P&L;
3. balance sheet;
4. cash-flow statement;
5. management accounts/trial balance;
6. bank/cash evidence;
7. A/R and A/P;
8. debt/financing;
9. recurring cost/invoice base;
10. contingent liabilities/financial disclosures.

No current buyer-grade cut-off pack is credited; historical provider/billing evidence and templates do not score these items.

### Tax denominator — 0/10

Required current evidence/conclusion groups:
1. VAT position;
2. VIES status;
3. corporate income-tax status;
4. tax-clearance/outstanding-tax evidence;
5. withholding/payroll review;
6. current activity/CAE tax reconciliation;
7. asset/IP-sale treatment;
8. share-sale treatment;
9. cross-border buyer treatment;
10. transaction-specific adviser conclusion.

The checklist is complete, but no current authoritative/adviser closure is credited.

### Provider-transfer denominator — 23/44

Each provider receives four controls: attributable service/account evidence; account/billing owner evidence; transfer/change-of-control confirmation; documented handover path.

| Provider | Evidence | Owner | Transfer/CoC | Handover | Points |
|---|---:|---:|---:|---:|---:|
| Vercel | 1 | 0 | 0 | 1 | 2/4 |
| Supabase | 1 | 0 | 0 | 1 | 2/4 |
| Stripe | 1 | 0 | 0 | 1 | 2/4 |
| Google OAuth / Identity | 1 | 0 | 0 | 1 | 2/4 |
| Google Workspace | 1 | 0 | 0 | 1 | 2/4 |
| GitHub / Actions | 1 | 0.5 | 0 | 1 | 2.5/4 |
| Sentry | 1 | 0 | 0 | 1 | 2/4 |
| Upstash / Redis | 1 | 0 | 0 | 1 | 2/4 |
| Resend | 1 | 0 | 0 | 1 | 2/4 |
| Cloudflare | 1 | 0 | 0 | 1 | 2/4 |
| PostHog | 1 | 0.5 | 0 | 1 | 2.5/4 |

## Score

| Domain | Formula | Score |
|---|---:|---:|
| INTERNAL_DOCUMENT_READINESS | 8/8 | **100.00%** |
| OFFICIAL_EVIDENCE_READINESS | 0/17 | **0.00%** |
| IP_CHAIN_READINESS | 3/10 | **30.00%** |
| FINANCIAL_READINESS | 0/10 | **0.00%** |
| TAX_READINESS | 0/10 | **0.00%** |
| PROVIDER_TRANSFER_READINESS | 23/44 | **52.27%** |

### Overall evidence-management readiness

The prompt requires the six domains to remain separate. For one management roll-up only, each domain is equally weighted:

```text
(100.00 + 0.00 + 30.00 + 0.00 + 0.00 + 52.27) / 6 = 30.38%
EXACT_PERCENT_COMPLETE=30.38%
EXACT_PERCENT_REMAINING=69.62%
```

This is **not** a statement that the transaction is 30.38% legally complete. It is a reproducible seller-side evidence-readiness score. Internal documentation remains 100%; the lower overall number is caused by missing official records, executed title-chain evidence, current financial/tax source records and provider transfer confirmations.

## Newly closed in this continuation

- 300-commit contributor sample reconciled: 220 primary account, 77 automation/commit account, 3 Dependabot.
- No additional human contributor identity appeared in that sample.
- PostHog DPA completion independently verified from corporate mailbox evidence.
- Stripe live account identity strengthened by direct Stripe corporate-mail evidence.
- Candidate company NIPC preserved as a lookup aid but kept unverified until official registry evidence.

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
PROVIDER_TRANSFER_CLOSURE_OPEN=YES
OVERALL_TRANSACTION_100=NO
EXACT_PERCENT_COMPLETE=30.38
EXACT_PERCENT_REMAINING=69.62
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
