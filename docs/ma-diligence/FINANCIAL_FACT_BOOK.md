# RISCK COMPLY — Financial Fact Book

Date: 2026-10-07  
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
| Operating costs | PARTIAL_EVIDENCE | DOCUMENTED / ACCOUNTANT_REQUIRED | Four Google provider invoices totaling €57.46 are credited; full ledger/provider reconciliation remains open. |
| Infrastructure costs | PARTIAL_EVIDENCE | DOCUMENTED | Google invoices plus authenticated Vercel billing are evidenced; Supabase/other infrastructure invoices and the complete ledger remain open. |
| Software subscriptions | PARTIAL_EVIDENCE | DOCUMENTED | Google Workspace invoices are credited; remaining provider subscriptions require invoices/account statements. |
| Contractors/payroll | NOT_CLAIMED | ACCOUNTANT_REQUIRED | Payroll/contractor ledger. |
| Marketing costs | NOT_CLAIMED | ACCOUNTANT_REQUIRED | Ledger/invoices. |
| Legal/compliance costs | NOT_CLAIMED | ACCOUNTANT_REQUIRED | Ledger/invoices. |
| Cash position | STRIPE_BALANCE_€0 / TOTAL_COMPANY_OPEN | PARTIAL | Stripe LIVE available and pending EUR balance are both €0; bank statements still required. |
| Debt | NOT_CLAIMED | ACCOUNTANT_REQUIRED | GL, financing agreements, bank records. |
| Payables | NOT_CLAIMED | ACCOUNTANT_REQUIRED | A/P aging. |
| Receivables | NOT_CLAIMED | ACCOUNTANT_REQUIRED | A/R aging. |
| Contingent liabilities | NOT_CLAIMED | LAWYER_REQUIRED | Litigation/claims/contract review + accountant. |
| CAPEX | NOT_CLAIMED | ACCOUNTANT_REQUIRED | Fixed asset register / GL. |
| OPEX | PARTIAL_EVIDENCE | DOCUMENTED / ACCOUNTANT_REQUIRED | Four Google invoices (€57.46) plus authenticated Vercel billed usage are directly evidenced; complete GL/management accounts and all-provider reconciliation remain open. |
| Forecast | Template prepared; no number asserted | OWNER_INPUT_REQUIRED | Board/management-approved assumptions. |
| Unit economics | Not meaningful until current revenue/customer data is verified | NOT_APPLICABLE / OWNER_INPUT_REQUIRED | Reopen when data exists. |

## Primary cost evidence credited — Vercel

Authenticated Vercel billing was reconciled on 2026-10-07 in adjacent UTC windows to avoid response-size truncation. These figures are bounded provider-side billing evidence and are not a substitute for the seller general ledger or bank statements.

| Period | Billed cost | Effective cost | Currency | Evidence boundary |
|---|---:|---:|---|---|
| 2026-08-23 to 2026-08-31 | 5.666039543434 | 49.867071903739 | USD | authenticated Vercel billing summary |
| 2026-09-01 to 2026-09-30 | 199.868731833411 | 212.350626994635 | USD | sum of complete adjacent authenticated Vercel windows |
| 2026-10-01 to 2026-10-07 | 57.819140336339 | 57.819140336339 | USD | authenticated Vercel billing summary |

June and July billing queries returned `costs_not_found`; they are **not** treated as zero. EUR and USD amounts are not combined without an accounting FX policy.

This new provider-side evidence moves requirement #56 OPEX from `OPEN` to `PARTIAL`. It does not close total OPEX, infrastructure costs, software subscriptions, cash, payables or the management accounts.

## Pre-revenue disclosure template

Use only if the owner and accountant confirm that the company/product is currently pre-revenue:

> As of [CUT-OFF DATE], RISCK COMPLY is pre-revenue. No MRR or ARR is claimed. Commercial outreach, pipeline, pilots or LOIs are disclosed separately and are not recorded as revenue unless an executed contract and recognized revenue support the amount.

```text
PRE_REVENUE_STATUS=SUPPORTED_BY_ZERO_STRIPE_ACTIVITY_BUT_NOT_YET_ACCOUNTING_CONFIRMED
STRIPE_LIVE_MRR=0
STRIPE_LIVE_ARR=0
TOTAL_COMPANY_MRR_ARR=ACCOUNTING_AND_CONTRACT_CONFIRMATION_REQUIRED
```

## Primary cost evidence credited — Google

Corporate mailbox attachments were reviewed on 2026-10-05. The following provider-originated invoices are credited as primary evidence for a bounded portion of operating/software costs:

| Invoice | Invoice date / period | Service | Amount | VAT shown | Diligence use |
|---|---|---|---:|---:|---|
| 5616114003 | 2026-06-30 / domain registration on 2026-06-23 | Domain registration | €12.00 | €0.00 | proves a real domain-related provider cost, not registrar legal title |
| 5644227151 | 2026-07-31 / 2026-07-07–07-31 | Google Workspace Business Starter, qty 2 | €13.06 | €0.00 | primary subscription-cost evidence |
| 5674882399 | 2026-08-31 / 2026-08-01–08-31 | Google Workspace Business Starter, qty 2 | €16.20 | €0.00 | primary subscription-cost evidence |
| 5695530738 | 2026-09-30 / 2026-09-01–09-30 | Google Workspace Business Starter, qty 2 | €16.20 | €0.00 | primary subscription-cost evidence |

The invoices identify Google Cloud EMEA Limited and show reverse-charge wording under Article 196 of Directive 2006/112/EC. That invoice treatment is **not** promoted into proof of the seller's VAT registration, VIES status or final tax position.

Total of the four credited invoices: **€57.46**. This is not a complete OPEX figure and must not be annualized as the full company cost base.

```text
PRIMARY_PROVIDER_COST_EVIDENCE=PASS_BOUNDED_GOOGLE
CREDITED_GOOGLE_INVOICES=4
CREDITED_GOOGLE_TOTAL_EUR=57.46
FULL_OPERATING_COST_BASE=OPEN
VAT_VIES_SELLER_STATUS=NOT_PROVEN_BY_PROVIDER_INVOICES
DOMAIN_LEGAL_TITLE=NOT_PROVEN_BY_BILLING_INVOICE
```

### Authenticated Vercel billing evidence — 2026-10-05

Authenticated Vercel API evidence for team `team_wu3LZI6ReFxO16xipv73GLwG` (Pro) was reviewed on 2026-10-05. The team has one confirmed member, `renanescola40-afk`, with role `OWNER`, and project `eurocomply-saas` is linked to GitHub `renanescola40-afk/eurocomply_saas`.

Bounded billing windows successfully returned provider-generated FOCUS billing data:
- 2026-08-23 through 2026-08-31: **USD 5.666039543434 billed cost**; **USD 49.867071903739 effective cost**.
- 2026-09-30 through 2026-10-05: **USD 41.392330372013 billed cost**; **USD 41.392330372013 effective cost**.

These bounded windows are primary provider evidence of real infrastructure/subscription spend. They are not a complete OPEX figure. June and July returned `costs_not_found`; the September full-month query exceeded the connector response limit and is not treated as a complete or zero-cost month.

Do not add these USD amounts to the Google EUR total or FX-convert them without an approved accounting policy.

```text
VERCEL_TEAM_PLAN=PRO
VERCEL_AUTHENTICATED_TEAM_OWNER=renanescola40-afk
VERCEL_BOUNDED_BILLED_COST_USD_AUG23_AUG31=5.666039543434
VERCEL_BOUNDED_BILLED_COST_USD_SEP30_OCT05=41.392330372013
VERCEL_COMPLETE_OPEX=NOT_PROVEN
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


## Stripe LIVE revalidation — 2026-10-06

Authenticated LIVE API revalidation returned:
- charges: 0 objects;
- invoices: 0 objects;
- customers: 0 objects;
- subscriptions (all statuses): 0 objects;
- balance transactions: 0 objects;
- available balance: EUR 0;
- pending balance: EUR 0.

This reconfirms zero Stripe-side commercial activity and balance only. It does not convert missing company-wide accounting or bank evidence into zero.
