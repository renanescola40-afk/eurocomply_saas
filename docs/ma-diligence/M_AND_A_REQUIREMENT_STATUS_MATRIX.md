# RISCK COMPLY — M&A Requirement Status Matrix

Date: 2026-10-05  
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
| 2 | Current legal name | PARTIAL | 0.5 | Owner-designated name exists; current registry proof open. |
| 3 | Company number/NIPC | PARTIAL | 0.5 | Candidate identifier appears in seller communications; official proof open. |
| 4 | Registered address | OPEN | 0.0 | Official registry evidence open. |
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

Corporate subtotal: **4.0 / 17 = 23.53%**

## IP ownership — requirements 18–37

| # | Requirement | State | Score | Basis |
|---:|---|---|---:|---|
| 18 | Source code ownership map | CLOSED | 1.0 | Asset/title map exists. |
| 19 | Creator/contributor register | CLOSED | 1.0 | 300-commit sample reconciled and register created. |
| 20 | Employee contribution register | PARTIAL | 0.5 | No employee identity found in sample; owner/full-history confirmation open. |
| 21 | Contractor contribution register | PARTIAL | 0.5 | No contractor identity found in sample; owner/full-history confirmation open. |
| 22 | IP assignment status | OPEN | 0.0 | Creator-to-seller executed transfer not identified. |
| 23 | Domain ownership | PARTIAL | 0.5 | Operational control/use evidenced; registrar title proof open. |
| 24 | Trademark/brand ownership | PARTIAL | 0.5 | Public brand use evidenced; title/registration not proven. |
| 25 | Logo/design ownership | PARTIAL | 0.5 | Assets exist; provenance/title not fully proven. |
| 26 | Documentation copyright ownership | PARTIAL | 0.5 | Repository documentation exists; seller title chain open. |
| 27 | Database rights position | PARTIAL | 0.5 | Database/schema evidence exists; legal title conclusion open. |
| 28 | Third-party code inventory | CLOSED | 1.0 | Dependency inventory exists. |
| 29 | OSS inventory | CLOSED | 1.0 | Lockfile-derived inventory exists. |
| 30 | SBOM | PARTIAL | 0.5 | Generation/attestation path exists; transaction-cutoff SBOM not yet credited. |
| 31 | OSS license obligations | CLOSED | 1.0 | License diligence records obligations/review items. |
| 32 | Copyleft risk review | CLOSED | 1.0 | LGPL review item explicitly identified; no false clean opinion claimed. |
| 33 | Commercial license dependencies | CLOSED | 1.0 | Material provider/dependency set documented. |
| 34 | Provider terms impacting transfer | PARTIAL | 0.5 | Provider/legal framework advanced; change-of-control/transferability incomplete. |
| 35 | IP encumbrances | OPEN | 0.0 | Seller confirmation/legal review open. |
| 36 | Security/source access history | CLOSED | 1.0 | Protected-main/CI/source governance evidence exists. |
| 37 | IP ownership representation evidence pack | CLOSED | 1.0 | Buyer evidence checklist and truth boundary exist. |

IP subtotal: **13.5 / 20 = 67.50%**

## Financial — requirements 38–63

| # | Requirement | State | Score | Basis |
|---:|---|---|---:|---|
| 38 | Revenue history | OPEN | 0.0 | Accounting source records not credited. |
| 39 | MRR | OPEN | 0.0 | Not claimed. |
| 40 | ARR | OPEN | 0.0 | Not claimed. |
| 41 | Customer count | OPEN | 0.0 | Not claimed. |
| 42 | Pipeline | PARTIAL | 0.5 | Strategic outreach exists; buyer-grade CRM pipeline not yet reconciled. |
| 43 | Sales outreach metrics | PARTIAL | 0.5 | Large outbound activity is evidenced; deduplicated metric pack not credited. |
| 44 | Operating costs | OPEN | 0.0 | Accounting/provider amounts open. |
| 45 | Infrastructure costs | PARTIAL | 0.5 | Provider cost categories mapped; amounts/invoices open. |
| 46 | Software subscriptions | PARTIAL | 0.5 | Provider set mapped; invoice/amount reconciliation open. |
| 47 | Contractors/payroll | OPEN | 0.0 | Source records open. |
| 48 | Marketing costs | OPEN | 0.0 | Source records open. |
| 49 | Legal/compliance costs | OPEN | 0.0 | Source records open. |
| 50 | Cash position | OPEN | 0.0 | Bank evidence open. |
| 51 | Debt | OPEN | 0.0 | Accounting/bank evidence open. |
| 52 | Payables | OPEN | 0.0 | A/P evidence open. |
| 53 | Receivables | OPEN | 0.0 | A/R evidence open. |
| 54 | Contingent liabilities | OPEN | 0.0 | Legal/accounting confirmation open. |
| 55 | CAPEX | OPEN | 0.0 | Accounting evidence open. |
| 56 | OPEX | OPEN | 0.0 | Accounting evidence open. |
| 57 | Forecast | OPEN | 0.0 | Template exists; approved assumptions not credited. |
| 58 | Unit economics | OPEN | 0.0 | Current revenue/customer evidence insufficient. |
| 59 | Historical P&L requirement | OPEN | 0.0 | Statements not credited. |
| 60 | Balance sheet requirement | OPEN | 0.0 | Statements not credited. |
| 61 | Cash flow requirement | OPEN | 0.0 | Statements not credited. |
| 62 | Bank statement requirement | OPEN | 0.0 | Statements not credited. |
| 63 | Management accounts requirement | OPEN | 0.0 | Accounts not credited. |

Financial subtotal: **2.0 / 26 = 7.69%**

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
| 83 | Current buyer signals | OPEN | 0.0 | Responses/interest must be separately attributed; no generic signal score claimed. |
| 84 | Customer references | OPEN | 0.0 | Not claimed. |
| 85 | Customer logos | OPEN | 0.0 | Not claimed. |
| 86 | Churn | OPEN | 0.0 | No customer baseline credited. |
| 87 | Retention | OPEN | 0.0 | No customer baseline credited. |
| 88 | Sales cycle | PARTIAL | 0.5 | GTM process exists; observed buyer-cycle dataset incomplete. |
| 89 | GTM model | CLOSED | 1.0 | Sales/GTM playbooks exist. |
| 90 | Addressable market claims | PARTIAL | 0.5 | Market positioning exists; transaction-grade market substantiation remains buyer-specific. |

Commercial subtotal: **5.0 / 15 = 33.33%**

## Providers — requirements 91–98

Each required provider family is `PARTIAL = 0.5`: runtime/inventory/DPA evidence exists, while account owner, billing owner, transferability or change-of-control remains incomplete.

| # | Provider | State | Score |
|---:|---|---|---:|
| 91 | Vercel | PARTIAL | 0.5 |
| 92 | Supabase | PARTIAL | 0.5 |
| 93 | Stripe | PARTIAL | 0.5 |
| 94 | Google | PARTIAL | 0.5 |
| 95 | Sentry | PARTIAL | 0.5 |
| 96 | Redis/Upstash | PARTIAL | 0.5 |
| 97 | Resend | PARTIAL | 0.5 |
| 98 | Other live providers | PARTIAL | 0.5 |

Provider subtotal: **4.0 / 8 = 50.00%**

## Reproducible overall evidence-closure score

```text
CORPORATE=4.0/17
IP=13.5/20
FINANCIAL=2.0/26
TAX=0.0/12
COMMERCIAL=5.0/15
PROVIDERS=4.0/8

TOTAL_SCORE=28.5
TOTAL_REQUIREMENTS=98

AUDITABLE_MA_EVIDENCE_CLOSURE=28.5/98=29.08%
AUDITABLE_MA_EVIDENCE_REMAINING=70.92%
```

This replaces prior non-reproducible overall management percentages. It does **not** reduce the separate internal-documentation score:

```text
INTERNAL_DOCUMENT_READINESS=100%
MANDATORY_INTERNAL_DOCUMENT_BLOCKERS=0
```

The difference is intentional: the documents needed to answer diligence are internally complete, while many underlying official, legal, accounting, tax and provider facts remain externally unclosed.
