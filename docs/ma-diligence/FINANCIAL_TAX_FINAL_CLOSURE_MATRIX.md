# RISCK COMPLY — Financial + Tax Final Closure Matrix

Date: 2026-10-06  
Seller: SAMUEL CERQUEIRA, UNIPESSOAL LDA  
Purpose: 100% sale diligence readiness without fabricated financial or tax facts.

## Truth rule

- VERIFIED means attributable source evidence exists.
- VERIFIED_ZERO means the relevant source proves zero for that bounded source only.
- PARTIAL means useful evidence exists but the complete seller-level fact is not proven.
- UNKNOWN means no sufficient source was found.
- PENDING means a known external fact is still required.
- Never convert NOT_FOUND into ZERO.

## Reconciled source evidence

| Requirement | Source | Period | Amount | Currency | Status | Remaining dependency |
|---|---|---|---:|---|---|---|
| Stripe charges | Stripe LIVE API | through 2026-10-06 | 0 objects | — | VERIFIED_ZERO | Does not prove company-wide revenue |
| Stripe invoices | Stripe LIVE API | through 2026-10-06 | 0 objects | — | VERIFIED_ZERO | Does not prove off-Stripe invoices |
| Stripe customers | Stripe LIVE API | through 2026-10-06 | 0 objects | — | VERIFIED_ZERO | Does not prove off-Stripe customers |
| Stripe subscriptions | Stripe LIVE API | through 2026-10-06 | 0 objects | — | VERIFIED_ZERO | Does not prove off-Stripe recurring contracts |
| Stripe balance transactions | Stripe LIVE API | through 2026-10-06 | 0 objects | — | VERIFIED_ZERO | Does not prove bank cash flows |
| Stripe balance available | Stripe LIVE API | 2026-10-06 | 0 | EUR | VERIFIED_ZERO | Bank statements required for seller cash |
| Stripe balance pending | Stripe LIVE API | 2026-10-06 | 0 | EUR | VERIFIED_ZERO | Bank statements required for seller cash |
| Google provider invoices | Provider PDF invoices | Jun–Sep 2026 | 57.46 total | EUR | VERIFIED_BOUNDED | Not complete OPEX |
| Vercel bounded billing | Authenticated Vercel billing API | bounded 2026 windows already recorded in fact book | see fact book | USD | VERIFIED_BOUNDED | Complete monthly/T12 cost base still open |
| Revenue history | Stripe + repository + contracts/accounting boundary | current | — | — | PARTIAL | GL, bank, issued invoices, executed contracts |
| MRR / ARR | Stripe + contract boundary | current | Stripe-side 0 | — | PARTIAL | Off-Stripe recurring contracts/accounting |
| Customer count | Stripe + contract boundary | current | Stripe-side 0 | — | PARTIAL | Signed customer records/contracts |
| Contracted revenue | Executed contracts/order forms | current | UNKNOWN | — | PENDING | Owner/accounting evidence |
| Operating costs | Provider evidence + GL | current | PARTIAL | mixed | PARTIAL | Full ledger + all providers |
| Cash position | Stripe + bank | current | Stripe-side 0 | EUR | PARTIAL | Bank statements |
| Debt | GL/bank/financing docs | current | UNKNOWN | — | PENDING | Accountant/owner evidence |
| Payables | A/P ledger | current | UNKNOWN | — | PENDING | Accountant evidence |
| Receivables | A/R ledger | current | UNKNOWN | — | PENDING | Accountant evidence |
| Payroll/contractors | Payroll/contractor ledger | current | UNKNOWN | — | PENDING | Accountant evidence |
| CAPEX | Fixed asset register / GL | current | UNKNOWN | — | PENDING | Accountant evidence |
| OPEX | GL + provider reconciliation | current | UNKNOWN complete total | — | PENDING | Accountant evidence |
| VAT status | Official tax/VIES evidence | current | UNKNOWN | — | PENDING | Authoritative seller evidence |
| Corporate tax status | Tax filings/certificates | current | UNKNOWN | — | PENDING | Accountant/AT evidence |
| Outstanding tax | AT certificate | current | UNKNOWN | — | PENDING | Current certidão de dívida e não dívida |
| Transaction tax | Deal-specific legal/tax analysis | signing/closing | UNKNOWN | — | PENDING | Buyer jurisdiction + structure + tax counsel |

## Internal completion status

All safe internal work is complete for:
- source-boundary definition;
- Stripe LIVE revalidation;
- known provider-evidence reconciliation;
- management-account templates;
- forecast/unit-economics framework;
- tax diligence matrix;
- jurisdiction question pack;
- external evidence request pack;
- buyer-facing financial truth summary;
- reproducible score reconciliation.

No internally generated template is treated as external evidence.

## Remaining external blockers

1. General ledger / trial balance.
2. Historical and current management P&L.
3. Balance sheet.
4. Cash-flow statement.
5. Bank statements.
6. A/R and A/P aging.
7. Payroll/contractor ledger.
8. Debt/financing confirmation.
9. Fixed asset register.
10. Current VAT/VIES evidence.
11. Current tax-status / debt-and-no-debt certificate.
12. Corporate-tax filings/status.
13. Transaction-specific tax advice once buyer jurisdiction and deal form are known.

FINANCIAL_INTERNAL_CLOSURE=100_PERCENT_OF_SAFE_INTERNAL_WORK  
TAX_INTERNAL_CLOSURE=100_PERCENT_OF_SAFE_INTERNAL_WORK  
EXTERNAL_EVIDENCE_GAPS=OPEN_AND_EXPLICIT  
FINANCIAL_TAX_GO=PASS_INTERNAL_CLOSURE_ONLY
