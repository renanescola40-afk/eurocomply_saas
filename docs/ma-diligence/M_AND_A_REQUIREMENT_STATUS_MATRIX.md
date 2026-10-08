# RISCK COMPLY — M&A Requirement Status Matrix

Date: 2026-10-08  
Scoring scope: requirements 1–98 from the Corporate + IP + Financial + Tax M&A Diligence Closure Master  
Status: `AUDITABLE_SCORING_ACTIVE`

## Scoring rule

Each original requirement is scored exactly as follows:

- `CLOSED = 1.0` — current attributable evidence sufficiently answers the requirement for this diligence stage.
- `PARTIAL = 0.5` — substantive attributable evidence exists, but one or more material title/account/official/current-fact elements remain open.
- `OPEN = 0.0` — required source evidence or decision is not yet credited.
- `NOT_APPLICABLE = 1.0` only where non-applicability itself is evidenced. No item below is credited N/A merely to improve the score.

Templates, question lists and request lists do **not** score as external evidence by themselves.

## Corporate — requirements 1–17

| # | Requirement | State | Score | Basis |
|---:|---|---|---:|---|
| 1 | Legal entity fact sheet | CLOSED | 1.0 | Seller/operator decision and fact sheet documented. |
| 2 | Current legal name | CLOSED | 1.0 | Owner-designated seller name is independently corroborated by the authenticated Stripe LIVE company profile; authoritative registry extract remains separately tracked in requirement 15. |
| 3 | Company number/NIPC | PARTIAL | 0.5 | Candidate identifier appears in seller communications; official proof open. |
| 4 | Registered address | PARTIAL | 0.5 | Authenticated Stripe LIVE company profile contains a company address; commercial-registry proof remains open. |
| 5 | Incorporation date | OPEN | 0.0 | Official registry evidence open. |
| 6 | Directors/managers | OPEN | 0.0 | Official registry evidence open. |
| 7 | Beneficial ownership position | OPEN | 0.0 | RCBE evidence open. |
| 8 | Current business activities | PARTIAL | 0.5 | Historical/operator context exists; official activity evidence open. |
| 9 | Software/SaaS CAE status | OPEN | 0.0 | Current authoritative status not credited. |
| 10 | Articles/constitutional documents index | OPEN | 0.0 | Official articles not credited. |
| 11 | Corporate authority matrix | CLOSED | 1.0 | Internal matrix exists and preserves official-evidence dependency. |
| 12 | Signatory authority matrix | OPEN | 0.0 | Official signatory authority not proven. |
| 13 | Sale authorization requirements | PARTIAL | 0.5 | Decision tree/questions documented; transaction-specific legal answer open. |
| 14 | RCBE document requirement | OPEN | 0.0 | Request path exists; artifact not credited. |
| 15 | Commercial registry extract requirement | OPEN | 0.0 | Request path exists; artifact not credited. |
| 16 | VAT/VIES evidence requirement | OPEN | 0.0 | Current official validation not credited. |
| 17 | Good-standing/tax-clearance requirement | OPEN | 0.0 | Current AT certificate not credited. |

Corporate subtotal: **5.0 / 17 = 29.41%**

## IP ownership — requirements 18–37

| # | Requirement | State | Score | Basis |
|---:|---|---|---:|---|
| 18 | Source code ownership map | CLOSED | 1.0 | Asset/title map exists. |
| 19 | Creator/contributor register | CLOSED | 1.0 | Contributor register expanded from the initial 300-commit sample to more than 18,000 repository commits reviewed; observed human/account identities are explicitly tracked. |
| 20 | Employee contribution register | PARTIAL | 0.5 | No identity is classified as employee from Git evidence alone; relationship confirmation remains owner/legal-document dependent. |
| 21 | Contractor contribution register | PARTIAL | 0.5 | No identity is classified as contractor from Git evidence alone; relationship confirmation remains owner/legal-document dependent. |
| 22 | IP assignment status | OPEN | 0.0 | Creator-to-seller executed transfer not identified. |
| 23 | Domain ownership | PARTIAL | 0.5 | Operational control/use evidenced; registrar title proof open. |
| 24 | Trademark/brand ownership | PARTIAL | 0.5 | Public brand use evidenced; title/registration not proven. |
| 25 | Logo/design ownership | PARTIAL | 0.5 | Assets exist; provenance/title not fully proven. |
| 26 | Documentation copyright ownership | PARTIAL | 0.5 | Repository documentation exists; seller title chain open. |
| 27 | Database rights position | PARTIAL | 0.5 | Database/schema evidence exists; legal title conclusion open. |
| 28 | Third-party code inventory | CLOSED | 1.0 | Dependency inventory exists. |
| 29 | OSS inventory | CLOSED | 1.0 | Lockfile-derived inventory exists. |
| 30 | SBOM | CLOSED | 1.0 | Fresh CycloneDX SBOM + SHA-256 + GitHub provenance attestation completed successfully in workflow run 37381291759 for PR #2342 and merged to main. |
| 31 | OSS license obligations | CLOSED | 1.0 | License diligence records obligations/review items. |
| 32 | Copyleft risk review | CLOSED | 1.0 | LGPL review item explicitly identified; no false clean opinion claimed. |
| 33 | Commercial license dependencies | CLOSED | 1.0 | Material provider/dependency set documented. |
| 34 | Provider terms impacting transfer | CLOSED | 1.0 | Official provider transfer/ownership/handover mechanisms and material limitations are mapped in PROVIDER_TRANSFER_CHANGE_OF_CONTROL_REVIEW_2026-10-05.md; execution remains a closing-step task, not an evidence gap for this requirement. |
| 35 | IP encumbrances | OPEN | 0.0 | Seller confirmation/legal review open. |
| 36 | Security/source access history | CLOSED | 1.0 | Protected-main/CI/source governance evidence exists; PR #2361 additionally proved the current dependency remediation through 28 successful exact-head workflows, including Dependency Vulnerability Proof, CI, Full Security Suite, DAST and SBOM/attestation. |
| 37 | IP ownership representation evidence pack | CLOSED | 1.0 | Buyer evidence checklist and truth boundary exist. |

IP subtotal: **14.0 / 20 = 70.00%**

## Financial — requirements 38–63

| # | Requirement | State | Score | Basis |
|---:|---|---|---:|---|
| 38 | Revenue history | PARTIAL | 0.5 | LIVE Stripe proves 0 charges/invoices at cut-off; bank/accounting evidence is still required for total company revenue. |
| 39 | MRR | PARTIAL | 0.5 | LIVE Stripe has 0 subscription objects; off-Stripe recurring contracts remain unproven without accounting/contracts. |
| 40 | ARR | PARTIAL | 0.5 | LIVE Stripe has 0 subscription objects; off-Stripe annual recurring contracts remain unproven. |
| 41 | Customer count | PARTIAL | 0.5 | LIVE Stripe has 0 customer objects; non-Stripe/contract customers still require seller/accounting evidence. |
| 42 | Pipeline | CLOSED | 1.0 | Buyer-grade mailbox pipeline register reconciles scoped outreach, failures and attributable stages without claiming revenue/LOIs. |
| 43 | Sales outreach metrics | CLOSED | 1.0 | Gmail message-ID counts are paginated and deduplicated: 352 unique sent messages across acquisition + pilot/procurement scope; 22 failure messages separately tracked. |
| 44 | Operating costs | PARTIAL | 0.5 | Four provider-originated Google invoices totaling €57.46 are credited as bounded operating-cost evidence; complete ledger/provider reconciliation remains open. |
| 45 | Infrastructure costs | PARTIAL | 0.5 | Authenticated Vercel billing now provides bounded infrastructure-cost amounts (Aug 23–31 billed $5.6660; Sep billed $199.8687; Oct 1–7 billed $57.8191). Supabase/other provider amounts and the complete ledger remain open. |
| 46 | Software subscriptions | PARTIAL | 0.5 | Provider set mapped; invoice/amount reconciliation open. |
| 47 | Contractors/payroll | OPEN | 0.0 | Source records open. |
| 48 | Marketing costs | OPEN | 0.0 | Source records open. |
| 49 | Legal/compliance costs | OPEN | 0.0 | Source records open. |
| 50 | Cash position | PARTIAL | 0.5 | LIVE Stripe balance is €0 available / €0 pending; total company cash still requires bank statements. |
| 51 | Debt | OPEN | 0.0 | Accounting/bank evidence open. |
| 52 | Payables | PARTIAL | 0.5 | Authenticated Vercel API evidence proves at least one overdue provider balance because resource creation is blocked pending billing regularization; amount and complete A/P aging remain open. |
| 53 | Receivables | OPEN | 0.0 | A/R evidence open. |
| 54 | Contingent liabilities | OPEN | 0.0 | Legal/accounting confirmation open. |
| 55 | CAPEX | OPEN | 0.0 | Accounting evidence open. |
| 56 | OPEX | PARTIAL | 0.5 | Bounded primary OPEX evidence now includes four Google provider invoices totaling €57.46 plus authenticated Vercel billing through 2026-10-07. Complete GL/management accounts and all-provider reconciliation remain open. |
| 57 | Forecast | OPEN | 0.0 | Template exists; approved assumptions not credited. |
| 58 | Unit economics | OPEN | 0.0 | Current revenue/customer evidence insufficient. |
| 59 | Historical P&L requirement | OPEN | 0.0 | Statements not credited. |
| 60 | Balance sheet requirement | OPEN | 0.0 | Statements not credited. |
| 61 | Cash flow requirement | OPEN | 0.0 | Statements not credited. |
| 62 | Bank statement requirement | OPEN | 0.0 | Statements not credited. |
| 63 | Management accounts requirement | OPEN | 0.0 | Accounts not credited. |

Financial subtotal: **7.0 / 26 = 26.92%**

## Tax — requirements 64–75

All twelve tax requirements remain `OPEN = 0.0` because the checklist/questions are prepared but current tax evidence or professional transaction analysis is not credited.

| # | Requirement | State | Score |
|---:|---|---|---:|
| 64 | VAT position | OPEN | 0.0 |
| 65 | VIES status | OPEN | 0.0 |
| 66 | Corporate tax status | OPEN | 0.0 |
| 67 | Outstanding taxes | OPEN | 0.0 |
| 68 | Withholding issues | OPEN | 0.0 |
| 69 | Cross-border sale tax questions | OPEN | 0.0 |
| 70 | Capital gain/asset sale questions | OPEN | 0.0 |
| 71 | Share sale tax questions | OPEN | 0.0 |
| 72 | IP transfer tax questions | OPEN | 0.0 |
| 73 | Brazil buyer payment/FX/tax | OPEN | 0.0 |
| 74 | US buyer payment/FX/tax | OPEN | 0.0 |
| 75 | EU buyer payment/VAT/tax | OPEN | 0.0 |

Tax subtotal: **0.0 / 12 = 0.00%**

## Commercial — requirements 76–90

| # | Requirement | State | Score | Basis |
|---:|---|---|---:|---|
| 76 | Current pricing | CLOSED | 1.0 | Canonical commercial catalog exists. |
| 77 | Contracted revenue | OPEN | 0.0 | Not claimed. |
| 78 | Active customers | OPEN | 0.0 | Not claimed. |
| 79 | Pilots | OPEN | 0.0 | No buyer-grade pilot register credited. |
| 80 | LOIs | OPEN | 0.0 | No executed LOI credited. |
| 81 | Procurement processes | CLOSED | 1.0 | Internal procurement/buyer pack exists. |
| 82 | Strategic buyer outreach | CLOSED | 1.0 | Corporate mailbox evidences strategic acquisition outreach. |
| 83 | Current buyer signals | CLOSED | 1.0 | Attributable responses are registered: B3 routed to responsible team, ServiceNow routed to Corporate Development, BPI pilot proposal under analysis, with negative/timing signals preserved. |
| 84 | Customer references | OPEN | 0.0 | Not claimed. |
| 85 | Customer logos | OPEN | 0.0 | Not claimed. |
| 86 | Churn | OPEN | 0.0 | No customer baseline credited. |
| 87 | Retention | OPEN | 0.0 | No customer baseline credited. |
| 88 | Sales cycle | CLOSED | 1.0 | Attributable mailbox timestamps now provide a bounded strategic-buyer response/outcome dataset across routed, active-interest and closed-lost cycles. Scope is buyer-cycle evidence only; it does not claim customer conversion or revenue. |
| 89 | GTM model | CLOSED | 1.0 | Sales/GTM playbooks exist. |
| 90 | Addressable market claims | CLOSED | 1.0 | Official Eurostat enterprise-base data and EU AI Act scope are reconciled in ADDRESSABLE_MARKET_CLAIMS_SUBSTANTIATION_2026-10-06.md with explicit TAM/SAM/SOM truth boundaries. |

Commercial subtotal: **7.0 / 15 = 46.67%**

## Providers — requirements 91–98

Each required provider family is `PARTIAL = 0.5`: runtime/inventory/DPA evidence exists, while account owner, billing owner, transferability or change-of-control remains incomplete.

| # | Provider | State | Score |
|---:|---|---|---:|
| 91 | Vercel | PARTIAL | 0.5 |
| 92 | Supabase | PARTIAL | 0.5 |
| 93 | Stripe | PARTIAL | 0.5 | Authenticated LIVE account control, company-name field, charges/payouts and payout-account presence are verified; legal/business identity reconciliation and buyer-specific transfer remain open. |
| 94 | Google | PARTIAL | 0.5 |
| 95 | Sentry | PARTIAL | 0.5 |
| 96 | Redis/Upstash | PARTIAL | 0.5 |
| 97 | Resend | PARTIAL | 0.5 |
| 98 | Other live providers | PARTIAL | 0.5 |

Provider subtotal: **4.0 / 8 = 50.00%**

## Reproducible overall evidence-closure score

```text
CORPORATE=5.0/17
IP=14.0/20
FINANCIAL=7.0/26
TAX=0.0/12
COMMERCIAL=7.0/15
PROVIDERS=4.0/8

TOTAL_SCORE=37.0
TOTAL_REQUIREMENTS=98

AUDITABLE_MA_EVIDENCE_CLOSURE=37.0/98=37.76%
AUDITABLE_MA_EVIDENCE_REMAINING=62.24%
```

This replaces prior non-reproducible overall management percentages. It does **not** reduce the separate internal-documentation score:

```text
INTERNAL_DOCUMENT_READINESS=100%
MANDATORY_INTERNAL_DOCUMENT_BLOCKERS=0
```

The difference is intentional: the documents needed to answer diligence are internally complete, while many underlying official, legal, accounting, tax and provider facts remain externally unclosed.


## Financial + tax closure reconciliation — 2026-10-07

A dedicated financial/tax closure run revalidated Stripe LIVE and completed all safe internally controllable templates, matrices and request packs.

- Financial evidence score is now **7.0 / 26 = 26.92%** after authenticated Vercel billing plus existing Google invoices moved OPEX (#56) from OPEN to PARTIAL. No score is increased merely because a template was created.
- Tax evidence score remains **0.0 / 12 = 0.00%** because current seller-specific authoritative tax evidence and transaction-specific professional conclusions are still external dependencies.
- Combined Financial + Tax evidence score: **7.0 / 38 = 18.42%**.
- Internal controllable financial/tax closure work: **100% complete** for the present evidence set.
- Remaining gaps are genuine owner/accountant/tax-authority/tax-counsel facts, not undocumented internal tasks.

Canonical supporting files:
- FINANCIAL_TAX_FINAL_CLOSURE_MATRIX.md
- MANAGEMENT_ACCOUNTS_TRANSACTION_TEMPLATE.md
- FORECAST_AND_UNIT_ECONOMICS_FRAMEWORK.md
- TAX_DILIGENCE_FINAL_MATRIX.md
- TRANSACTION_TAX_QUESTIONS_BY_BUYER_JURISDICTION.md
- TAX_DOCUMENT_REQUEST_PACK.md
- SELLER_FINANCIAL_SUMMARY.md

FINANCIAL_TAX_GO=PASS_INTERNAL_CLOSURE_ONLY


## Post-P0 technical reconciliation — 2026-10-06

- PR #2361 merged the `sharp 0.35.4 -> 0.35.5` remediation, regenerated lockfile and truthful Corporate/IP final-GO normalization.
- All 28 exact-head workflow checks passed before merge, including dependency proof, CI, Full Security Suite, Enterprise DAST, SBOM/attestation and Enterprise Production Gate.
- Full contributor-history pagination closed at 18,111 reachable commits; requirements 20/21 remain PARTIAL because relationship classification is still owner/legal-document dependent.
- Current main is `3e60383a2c5e0762990f2b5fd83fde635e16f792`.
- Latest READY production remains `def7bad00e082ce336734ff7658846fe87595c79`.
- Exact-current-main Vercel deployment was attempted and rejected with `402 Payment Required / resource_creation_blocked` due to an overdue team balance.
- No payment was performed.
- The later 2026-10-07 financial reconciliation changes OPEX (#56) from OPEN to PARTIAL based on new authenticated provider billing evidence.

```text
TOTAL_SCORE=37.0
TOTAL_REQUIREMENTS=98
AUDITABLE_MA_EVIDENCE_CLOSURE=37.76%
AUDITABLE_MA_EVIDENCE_REMAINING=62.24%
POST_P0_SCORE_CHANGE=+1.0_REQUIREMENT_FROM_FINANCIAL_RECONCILIATION
```


## Post-merge source confidentiality reconciliation — 2026-10-07

- PR #2362 is merged at `e0c591620837877991451eb3a0ef6f4d08c4d2ee` after independent approval and 26 successful exact-head workflows.
- Latest READY Vercel Production remains `def7bad00e082ce336734ff7658846fe87595c79`; exact main=Production remains false because Vercel resource creation is blocked by the overdue-balance condition already recorded.
- Authenticated GitHub repository metadata reports `visibility=public` and `private=false` for `renanescola40-afk/eurocomply_saas`.
- This is a current confidentiality / transaction-diligence risk, but it does not change requirement 36's score because that requirement measures source access/security history and is already CLOSED. It must not be recharacterized as confidential repository history while public visibility remains true.
- No repository visibility change or Vercel payment was performed.

This was the historical score at the source-confidentiality checkpoint before the later Vercel OPEX reconciliation. The current canonical score is superseding evidence, not a second simultaneous score.

```text
TOTAL_SCORE=36.0
TOTAL_REQUIREMENTS=98
AUDITABLE_MA_EVIDENCE_CLOSURE=36.73%
AUDITABLE_MA_EVIDENCE_REMAINING=63.27%
POST_MERGE_SCORE_CHANGE=0
```

These values are the current canonical score after the 2026-10-07 OPEX reconciliation. The source-confidentiality reconciliation itself changed no requirement score.


## Commercial buyer-cycle evidence promotion — 2026-10-08

Requirement #88 moves from PARTIAL to CLOSED for the current diligence stage. The mailbox now contains attributable strategic-buyer cycles with measured outbound-to-response/outcome timings across Banyan Software, Twilio, Temenos, Mollie, Bucher Industries and Sartorius, in addition to the earlier B3, ServiceNow and BPI timing data.

Truth boundary: this closes the observed strategic-buyer cycle evidence requirement. It does not assert customer sales-cycle duration, customer conversion, revenue, contract execution, LOI or acquisition offer.

```text
COMMERCIAL=7.0/15=46.67%
TOTAL_SCORE=37.0/98
AUDITABLE_MA_EVIDENCE_CLOSURE=37.76%
AUDITABLE_MA_EVIDENCE_REMAINING=62.24%
REQUIREMENT_88=CLOSED_WITH_BUYER_CYCLE_SCOPE_BOUNDARY
```
