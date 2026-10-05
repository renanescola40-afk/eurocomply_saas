# RISCK COMPLY — Financial Fact Book

Date: 2026-10-05  
Status: `FINANCIAL_DILIGENCE_INTERNAL=PASS_STRUCTURE / FINANCIAL_SOURCE_RECORDS=OPEN`

This fact book intentionally does not invent revenue, customers, cash, liabilities, taxes or bank balances.

## Current evidence boundary

Repository evidence alone did not establish authoritative MRR, ARR, customer count, contracted revenue, bank balances, debt, receivables or payables. The authenticated Stripe LIVE account has now been reconciled and shows zero customer, subscription, charge and invoice objects plus zero EUR available/pending Stripe balance. This proves zero activity **on Stripe**, not zero activity across the seller entity.

A historical or informal statement must not be promoted to transaction fact without a dated closing-period source.

## Financial facts

| Item | Current M&A position | Classification | Required source |
|---|---|---|---|
| Revenue history | STRIPE_LIVE_ZERO_ACTIVITY_VERIFIED / TOTAL_COMPANY_OPEN | PARTIAL | Stripe LIVE has 0 charges/invoices; GL/bank records required for total company revenue. |
| MRR | STRIPE_LIVE_0 / TOTAL_COMPANY_OPEN | PARTIAL | Stripe LIVE has 0 subscriptions; executed off-Stripe recurring contracts/accounting remain open. |
| ARR | STRIPE_LIVE_0 / TOTAL_COMPANY_OPEN | PARTIAL | Stripe LIVE has 0 subscriptions; off-Stripe annual contracts remain open. |
| Customer count | STRIPE_LIVE_0 / TOTAL_COMPANY_OPEN | PARTIAL | Stripe LIVE has 0 customer objects; signed contracts/customer records remain required. |
| Contracted revenue | NOT_CLAIMED | OWNER_INPUT_REQUIRED | Executed contracts/order forms. |
| Pipeline | NOT_CLAIMED | OWNER_INPUT_REQUIRED | CRM/outreach register with stages and dates. |
| Sales outreach metrics | NOT_CLAIMED | OWNER_INPUT_REQUIRED | Mail/CRM export, deduplicated. |
| Operating costs | NOT_CLAIMED | ACCOUNTANT_REQUIRED | Bank/accounting/provider invoices. |
| Infrastructure costs | PARTIALLY_MAPPABLE | DOCUMENTED | Vercel/Supabase/Stripe/Sentry/Redis/email invoices required for amounts. |
| Software subscriptions | PARTIALLY_MAPPABLE | DOCUMENTED | Provider invoices/account statements required. |
| Contractors/payroll | NOT_CLAIMED | ACCOUNTANT_REQUIRED | Payroll/contractor ledger. |
| Marketing costs | NOT_CLAIMED | ACCOUNTANT_REQUIRED | Ledger/invoices. |
| Legal/compliance costs | NOT_CLAIMED | ACCOUNTANT_REQUIRED | Ledger/invoices. |
| Cash position | STRIPE_BALANCE_€0 / TOTAL_COMPANY_OPEN | PARTIAL | Stripe LIVE available and pending EUR balance are both €0; bank statements still required. |
| Debt | NOT_CLAIMED | ACCOUNTANT_REQUIRED | GL, financing agreements, bank records. |
| Payables | NOT_CLAIMED | ACCOUNTANT_REQUIRED | A/P aging. |
| Receivables | NOT_CLAIMED | ACCOUNTANT_REQUIRED | A/R aging. |
| Contingent liabilities | NOT_CLAIMED | LAWYER_REQUIRED | Litigation/claims/contract review + accountant. |
| CAPEX | NOT_CLAIMED | ACCOUNTANT_REQUIRED | Fixed asset register / GL. |
| OPEX | NOT_CLAIMED | ACCOUNTANT_REQUIRED | GL/management accounts. |
| Forecast | Template prepared; no number asserted | OWNER_INPUT_REQUIRED | Board/management-approved assumptions. |
| Unit economics | Not meaningful until current revenue/customer data is verified | NOT_APPLICABLE / OWNER_INPUT_REQUIRED | Reopen when data exists. |

## Pre-revenue disclosure template

Use only if the owner and accountant confirm that the company/product is currently pre-revenue:

> As of [CUT-OFF DATE], RISCK COMPLY is pre-revenue. No MRR or ARR is claimed. Commercial outreach, pipeline, pilots or LOIs are disclosed separately and are not recorded as revenue unless an executed contract and recognized revenue support the amount.

```text
PRE_REVENUE_STATUS=SUPPORTED_BY_ZERO_STRIPE_ACTIVITY_BUT_NOT_YET_ACCOUNTING_CONFIRMED
STRIPE_LIVE_MRR=0
STRIPE_LIVE_ARR=0
TOTAL_COMPANY_MRR_ARR=ACCOUNTING_AND_CONTRACT_CONFIRMATION_REQUIRED
```

## Cost-base summary template

Capture monthly and trailing-12-month amounts for:
- Vercel;
- Supabase;
- Stripe fees;
- Google Workspace/OAuth-related paid services;
- Sentry;
- Upstash/Redis;
- Resend;
- GitHub;
- security/testing;
- legal/accounting;
- contractors/payroll;
- marketing;
- domains/trademarks;
- insurance;
- other subscriptions.

Each row requires invoice/account evidence and currency.

## Historical statements required

For buyer-grade financial diligence, obtain where applicable:
- historical P&L / income statements;
- balance sheets;
- cash-flow statements;
- management accounts through latest month;
- general ledger / trial balance;
- bank statements;
- A/R and A/P aging;
- tax returns/assessments;
- annual accounts / IES evidence;
- fixed asset register;
- debt/financing schedules.

## Buyer financial Q&A

1. What is the transaction cut-off date?
2. Is RISCK COMPLY pre-revenue on that date?
3. Are any invoices issued but unpaid?
4. Are any contracts signed but revenue not recognized?
5. Are any pilots paid, discounted or free?
6. Are any LOIs binding or non-binding?
7. What recurring infrastructure cost is attributable solely to RISCK COMPLY?
8. Are company expenses shared with other businesses of the seller entity?
9. Which costs must be normalized/separated for a carve-out valuation?
10. Are founder/related-party costs or assets being contributed without charge?
11. Are there deferred tax, VAT or payroll exposures?
12. What working capital is required at closing?

## Forecast template

Do not populate without owner assumptions. Minimum fields: month, opening customers, new customers, churn, ARPA, MRR, annual-contract billings, gross revenue, payment fees, infrastructure, payroll/contractor, sales/marketing, legal/compliance, other OPEX, EBITDA proxy, cash flow and closing cash.

## Current conclusion

```text
FINANCIAL_FACT_BOOK_STRUCTURE=PASS
STRIPE_LIVE_REVENUE_ACTIVITY=ZERO_VERIFIED
STRIPE_LIVE_MRR_ARR=ZERO_VERIFIED
STRIPE_LIVE_CUSTOMER_COUNT=ZERO_VERIFIED
STRIPE_LIVE_BALANCE_EUR=ZERO_VERIFIED
TOTAL_COMPANY_REVENUE_MRR_ARR_CUSTOMERS=ACCOUNTING_AND_CONTRACT_CONFIRMATION_REQUIRED
BANK_CASH=OPEN_OFFICIAL_EVIDENCE
P_AND_L=ACCOUNTANT_REQUIRED
BALANCE_SHEET=ACCOUNTANT_REQUIRED
CASH_FLOW=ACCOUNTANT_REQUIRED
MANAGEMENT_ACCOUNTS=ACCOUNTANT_REQUIRED
```
