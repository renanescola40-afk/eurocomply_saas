# RISCK COMPLY — M&A 98-Requirement Evidence Reconciliation

Snapshot: 2026-10-16. Main SHA observed: `2be90295d9791938315da7c25ed25e9429597e52`. Source: `docs/ma-diligence/M_AND_A_REQUIREMENT_STATUS_MATRIX.md` on `main`. Classification: INTERNAL; NO BUYER RELEASE.

## Material score discrepancy — DO NOT ASSERT CURRENT 37/98 AS RECONCILED

The document states **37.0/98 = 37.76%** (2026-10-08 authority). A mechanical sum of its **98 actual scored requirement rows** currently returns **37.5/98 = 38.27%**, with **61.73%** uncredited. The difference is in IP: IP requirement row scores add to **14.5/20**, but the written IP subtotal states **14.0/20**. All other domain subtotals match the row totals. This must be investigated with source provenance before changing the canonical scoring authority or reporting any increase. **Neither figure is a newly independent verification of legal/accountant/buyer evidence.**

| Domain | Row sum | Written canonical subtotal |
|---|---:|---:|
| Corporate | 5/17 | 5/17 |
| IP ownership | 14.5/20 | 14/20 — MISMATCH |
| Financial | 7/26 | 7/26 |
| Tax | 0/12 | 0/12 |
| Commercial | 7/15 | 7/15 |
| Providers | 4/8 | 4/8 |
| **Total** | **37.5/98** | **37/98 — MISMATCH** |

## Complete source-row transcription

| ID | Domain | Requirement | Documented status | Row credit | Source limitation |
|---:|---|---|---|---:|---|
| 1 | Corporate | Legal entity fact sheet | CLOSED | 1.0 | Seller/operator decision and fact sheet documented. |
| 2 | Corporate | Current legal name | CLOSED | 1.0 | Owner-designated seller name is independently corroborated by the authenticated Stripe LIVE company profile; authoritative registry extract remains separately tracked in requirement 15. |
| 3 | Corporate | Company number/NIPC | PARTIAL | 0.5 | Candidate identifier appears in seller communications; official proof open. |
| 4 | Corporate | Registered address | PARTIAL | 0.5 | Authenticated Stripe LIVE company profile contains a company address; commercial-registry proof remains open. |
| 5 | Corporate | Incorporation date | OPEN | 0.0 | Official registry evidence open. |
| 6 | Corporate | Directors/managers | OPEN | 0.0 | Official registry evidence open. |
| 7 | Corporate | Beneficial ownership position | OPEN | 0.0 | RCBE evidence open. |
| 8 | Corporate | Current business activities | PARTIAL | 0.5 | Historical/operator context exists; official activity evidence open. |
| 9 | Corporate | Software/SaaS CAE status | OPEN | 0.0 | Current authoritative status not credited. |
| 10 | Corporate | Articles/constitutional documents index | OPEN | 0.0 | Official articles not credited. |
| 11 | Corporate | Corporate authority matrix | CLOSED | 1.0 | Internal matrix exists and preserves official-evidence dependency. |
| 12 | Corporate | Signatory authority matrix | OPEN | 0.0 | Official signatory authority not proven. |
| 13 | Corporate | Sale authorization requirements | PARTIAL | 0.5 | Decision tree/questions documented; transaction-specific legal answer open. |
| 14 | Corporate | RCBE document requirement | OPEN | 0.0 | Request path exists; artifact not credited. |
| 15 | Corporate | Commercial registry extract requirement | OPEN | 0.0 | Request path exists; artifact not credited. |
| 16 | Corporate | VAT/VIES evidence requirement | OPEN | 0.0 | Current official validation not credited. |
| 17 | Corporate | Good-standing/tax-clearance requirement | OPEN | 0.0 | Current AT certificate not credited. |
| 18 | IP ownership | Source code ownership map | CLOSED | 1.0 | Asset/title map exists. |
| 19 | IP ownership | Creator/contributor register | CLOSED | 1.0 | Contributor register expanded from the initial 300-commit sample to more than 18,000 repository commits reviewed; observed human/account identities are explicitly tracked. |
| 20 | IP ownership | Employee contribution register | PARTIAL | 0.5 | No identity is classified as employee from Git evidence alone; relationship confirmation remains owner/legal-document dependent. |
| 21 | IP ownership | Contractor contribution register | PARTIAL | 0.5 | No identity is classified as contractor from Git evidence alone; relationship confirmation remains owner/legal-document dependent. |
| 22 | IP ownership | IP assignment status | OPEN | 0.0 | Creator-to-seller executed transfer not identified. |
| 23 | IP ownership | Domain ownership | PARTIAL | 0.5 | Operational control/use evidenced; registrar title proof open. |
| 24 | IP ownership | Trademark/brand ownership | PARTIAL | 0.5 | Public brand use evidenced; title/registration not proven. |
| 25 | IP ownership | Logo/design ownership | PARTIAL | 0.5 | Assets exist; provenance/title not fully proven. |
| 26 | IP ownership | Documentation copyright ownership | PARTIAL | 0.5 | Repository documentation exists; seller title chain open. |
| 27 | IP ownership | Database rights position | PARTIAL | 0.5 | Database/schema evidence exists; legal title conclusion open. |
| 28 | IP ownership | Third-party code inventory | CLOSED | 1.0 | Dependency inventory exists. |
| 29 | IP ownership | OSS inventory | CLOSED | 1.0 | Lockfile-derived inventory exists. |
| 30 | IP ownership | SBOM | CLOSED | 1.0 | Fresh CycloneDX SBOM + SHA-256 + GitHub provenance attestation completed successfully in workflow run 37381291759 for PR #2342 and merged to main. |
| 31 | IP ownership | OSS license obligations | CLOSED | 1.0 | License diligence records obligations/review items. |
| 32 | IP ownership | Copyleft risk review | CLOSED | 1.0 | LGPL review item explicitly identified; no false clean opinion claimed. |
| 33 | IP ownership | Commercial license dependencies | CLOSED | 1.0 | Material provider/dependency set documented. |
| 34 | IP ownership | Provider terms impacting transfer | CLOSED | 1.0 | Official provider transfer/ownership/handover mechanisms and material limitations are mapped in PROVIDER_TRANSFER_CHANGE_OF_CONTROL_REVIEW_2026-10-05.md; execution remains a closing-step task, not an evidence gap for this requirement. |
| 35 | IP ownership | IP encumbrances | OPEN | 0.0 | Seller confirmation/legal review open. |
| 36 | IP ownership | Security/source access history | CLOSED | 1.0 | Protected-main/CI/source governance evidence exists; PR #2361 additionally proved the current dependency remediation through 28 successful exact-head workflows, including Dependency Vulnerability Proof, CI, Full Security Suite, DAST and SBOM/attestation. |
| 37 | IP ownership | IP ownership representation evidence pack | CLOSED | 1.0 | Buyer evidence checklist and truth boundary exist. |
| 38 | Financial | Revenue history | PARTIAL | 0.5 | LIVE Stripe proves 0 charges/invoices at cut-off; bank/accounting evidence is still required for total company revenue. |
| 39 | Financial | MRR | PARTIAL | 0.5 | LIVE Stripe has 0 subscription objects; off-Stripe recurring contracts remain unproven without accounting/contracts. |
| 40 | Financial | ARR | PARTIAL | 0.5 | LIVE Stripe has 0 subscription objects; off-Stripe annual recurring contracts remain unproven. |
| 41 | Financial | Customer count | PARTIAL | 0.5 | LIVE Stripe has 0 customer objects; non-Stripe/contract customers still require seller/accounting evidence. |
| 42 | Financial | Pipeline | CLOSED | 1.0 | Buyer-grade mailbox pipeline register reconciles scoped outreach, failures and attributable stages without claiming revenue/LOIs. |
| 43 | Financial | Sales outreach metrics | CLOSED | 1.0 | Gmail message-ID counts are paginated and deduplicated: 352 unique sent messages across acquisition + pilot/procurement scope; 22 failure messages separately tracked. |
| 44 | Financial | Operating costs | PARTIAL | 0.5 | Four provider-originated Google invoices totaling €57.46 are credited as bounded operating-cost evidence; complete ledger/provider reconciliation remains open. |
| 45 | Financial | Infrastructure costs | PARTIAL | 0.5 | Authenticated Vercel billing now provides bounded infrastructure-cost amounts (Aug 23–31 billed $5.6660; Sep billed $199.8687; Oct 1–7 billed $57.8191). Supabase/other provider amounts and the complete ledger remain open. |
| 46 | Financial | Software subscriptions | PARTIAL | 0.5 | Provider set mapped; invoice/amount reconciliation open. |
| 47 | Financial | Contractors/payroll | OPEN | 0.0 | Source records open. |
| 48 | Financial | Marketing costs | OPEN | 0.0 | Source records open. |
| 49 | Financial | Legal/compliance costs | OPEN | 0.0 | Source records open. |
| 50 | Financial | Cash position | PARTIAL | 0.5 | LIVE Stripe balance is €0 available / €0 pending; total company cash still requires bank statements. |
| 51 | Financial | Debt | OPEN | 0.0 | Accounting/bank evidence open. |
| 52 | Financial | Payables | PARTIAL | 0.5 | Authenticated Vercel API evidence proves at least one overdue provider balance because resource creation is blocked pending billing regularization; amount and complete A/P aging remain open. |
| 53 | Financial | Receivables | OPEN | 0.0 | A/R evidence open. |
| 54 | Financial | Contingent liabilities | OPEN | 0.0 | Legal/accounting confirmation open. |
| 55 | Financial | CAPEX | OPEN | 0.0 | Accounting evidence open. |
| 56 | Financial | OPEX | PARTIAL | 0.5 | Bounded primary OPEX evidence now includes four Google provider invoices totaling €57.46 plus authenticated Vercel billing through 2026-10-07. Complete GL/management accounts and all-provider reconciliation remain open. |
| 57 | Financial | Forecast | OPEN | 0.0 | Template exists; approved assumptions not credited. |
| 58 | Financial | Unit economics | OPEN | 0.0 | Current revenue/customer evidence insufficient. |
| 59 | Financial | Historical P&L requirement | OPEN | 0.0 | Statements not credited. |
| 60 | Financial | Balance sheet requirement | OPEN | 0.0 | Statements not credited. |
| 61 | Financial | Cash flow requirement | OPEN | 0.0 | Statements not credited. |
| 62 | Financial | Bank statement requirement | OPEN | 0.0 | Statements not credited. |
| 63 | Financial | Management accounts requirement | OPEN | 0.0 | Accounts not credited. |
| 64 | Tax | VAT position | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 65 | Tax | VIES status | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 66 | Tax | Corporate tax status | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 67 | Tax | Outstanding taxes | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 68 | Tax | Withholding issues | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 69 | Tax | Cross-border sale tax questions | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 70 | Tax | Capital gain/asset sale questions | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 71 | Tax | Share sale tax questions | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 72 | Tax | IP transfer tax questions | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 73 | Tax | Brazil buyer payment/FX/tax | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 74 | Tax | US buyer payment/FX/tax | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 75 | Tax | EU buyer payment/VAT/tax | OPEN | 0.0 | No expanded basis in row; consult section narrative and original evidence. |
| 76 | Commercial | Current pricing | CLOSED | 1.0 | Canonical commercial catalog exists. |
| 77 | Commercial | Contracted revenue | OPEN | 0.0 | Not claimed. |
| 78 | Commercial | Active customers | OPEN | 0.0 | Not claimed. |
| 79 | Commercial | Pilots | OPEN | 0.0 | No buyer-grade pilot register credited. |
| 80 | Commercial | LOIs | OPEN | 0.0 | No executed LOI credited. |
| 81 | Commercial | Procurement processes | CLOSED | 1.0 | Internal procurement/buyer pack exists. |
| 82 | Commercial | Strategic buyer outreach | CLOSED | 1.0 | Corporate mailbox evidences strategic acquisition outreach. |
| 83 | Commercial | Current buyer signals | CLOSED | 1.0 | Attributable responses are registered: B3 routed to responsible team, ServiceNow routed to Corporate Development, BPI pilot proposal under analysis, with negative/timing signals preserved. |
| 84 | Commercial | Customer references | OPEN | 0.0 | Not claimed. |
| 85 | Commercial | Customer logos | OPEN | 0.0 | Not claimed. |
| 86 | Commercial | Churn | OPEN | 0.0 | No customer baseline credited. |
| 87 | Commercial | Retention | OPEN | 0.0 | No customer baseline credited. |
| 88 | Commercial | Sales cycle | CLOSED | 1.0 | Attributable mailbox timestamps now provide a bounded strategic-buyer response/outcome dataset across routed, active-interest and closed-lost cycles. Scope is buyer-cycle evidence only; it does not claim customer conversion or revenue. |
| 89 | Commercial | GTM model | CLOSED | 1.0 | Sales/GTM playbooks exist. |
| 90 | Commercial | Addressable market claims | CLOSED | 1.0 | Official Eurostat enterprise-base data and EU AI Act scope are reconciled in ADDRESSABLE_MARKET_CLAIMS_SUBSTANTIATION_2026-10-06.md with explicit TAM/SAM/SOM truth boundaries. |
| 91 | Providers | Vercel | PARTIAL | 0.5 | No expanded basis in row; consult section narrative and original evidence. |
| 92 | Providers | Supabase | PARTIAL | 0.5 | No expanded basis in row; consult section narrative and original evidence. |
| 93 | Providers | Stripe | PARTIAL | 0.5 | Authenticated LIVE account control, company-name field, charges/payouts and payout-account presence are verified; legal/business identity reconciliation and buyer-specific transfer remain open. |
| 94 | Providers | Google | PARTIAL | 0.5 | No expanded basis in row; consult section narrative and original evidence. |
| 95 | Providers | Sentry | PARTIAL | 0.5 | No expanded basis in row; consult section narrative and original evidence. |
| 96 | Providers | Redis/Upstash | PARTIAL | 0.5 | No expanded basis in row; consult section narrative and original evidence. |
| 97 | Providers | Resend | PARTIAL | 0.5 | No expanded basis in row; consult section narrative and original evidence. |
| 98 | Providers | Other live providers | PARTIAL | 0.5 | No expanded basis in row; consult section narrative and original evidence. |

## Independent non-score gates

- Executed creator-to-seller chain of title is NOT CREDITED, regardless of internal documentation completeness.
- Registry, articles, RCBE, CAE, legally valid seller signing power, official tax and accountant-backed company records remain externally dependent per source documentation.
- Source control is PRIVATE according to authenticated 2026-10-16 metadata, but historical public exposure has not been cleared.
- DataGuard internal documentary scope was previously prepared 100%, verified 90%, buyer release HOLD; this is not an M&A evidence numerator.
- Production/main SHA parity, independent pentest, ISO and SOC 2 reports are not independently re-proven by this register.

Promotion requires timestamped attributable primary evidence, exact issue scope and a reviewer. No templates, emails, prices, signatures, deployment or provider transfers were executed by this reconciliation. Keep underlying documents and confidential originals in controlled storage, not the source tree.
