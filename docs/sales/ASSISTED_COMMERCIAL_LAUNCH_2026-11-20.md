# RISCK COMPLY — Assisted B2B commercial launch, 20 November 2026

Status: `INTERNAL_PREPARED / PUBLIC_LAUNCH_CONDITIONAL / PRODUCTION_NO_GO`  
Owner decision recorded: 17 November 2026  
Target: Friday, 20 November 2026 (Europe/Lisbon)  
Scope: sales preparation and marketing lead capture, not SaaS production authorization

## 1. Owner-approved decisions

- RISCK COMPLY contracts via **SAMUEL CERQUEIRA, UNIPESSOAL LDA** (owner-designated seller; formal registry/signatory evidence and final legal approval remain separately required).
- Commercial mailbox `comercial@risckcomply.com`: owner confirms send and receive access; application-to-inbox delivery is NOT yet proven end to end.
- Buyer scope: private-sector B2B in the EU, UK and Switzerland, and other territories evaluated case by case; no government/public sector sales as an initial motion.
- Acquisition channels: (a) targeted, individually qualified B2B outbound; (b) inbound site/demo requests. No unsolicited mass blasts or automatically sent outreach.
- All initial plans use **assisted sales and onboarding**. No free trial, automatic paid activation or false operational launch claim.
- Vercel: owner intends to address outstanding payment by Friday; do not change production, trigger extra builds/deploys or change DNS before account status and security release checks.
- SaaS CAE activity update and Stripe LIVE legal-type reconciliation: owner defers administrative work, but **this does not waive mandatory prerequisites before paid service supply, invoicing, execution of effective contracts or payment collection**.

## 2. Canonical plan references — unchanged

| Plan | Monthly price reference | Acquisition action |
| --- | ---: | --- |
| Essential | EUR 49 | Request access / book demo, plan preselected |
| Professional | EUR 149 | Request access / book demo, plan preselected |
| Business | EUR 399 | Book business demo |
| Enterprise | From EUR 990 | Sales-led negotiation and approved order form |

Canonical authority: `config/billing-commercial-catalog.json`; taxes depend on customer and transaction facts. Enterprise is not a fixed-price checkout. Only currently implemented, demonstrable features may be promised.

## 3. Independent operating procedure — before Vercel recovery

### Inbound
1. Keep public CTA PR #2748 under ordinary CI and independent review; do not merge/bypass release policy while failing required checks remain.
2. Prepare `comercial@risckcomply.com` to receive manual requests even when the website is unavailable; do not imply that visitors can submit a functioning form until a real public smoke test passes.
3. When a lead arrives, record minimal data in an approved private CRM/sales system: company, business contact, region, stated need, consent/source, requested plan, owner, next action, date. Do **not** store lead PII in GitHub, issue comments, PRs, public documents or demo fixtures.
4. Confirm receipt manually only after actually receiving it; never claim a demo, contract or workspace is booked before confirmation.

### Outbound (no automated sending)
1. Select accounts based on verified business relevance, jurisdiction, procurement capacity, and a plausible inventory/risk/evidence workflow need.
2. Verify the person and public work contact independently. Use only proportionate business contact data; apply applicable PECR/ePrivacy/GDPR marketing rules, including country-specific requirements and opt-out handling.
3. Personalize one message around a real public fact, offer a brief discovery meeting, and use truthful non-promissory language. Record outreach and opt-outs securely.
4. Do not send messages or create sequences without the owner's explicit approval.

### Discovery and demonstration
1. Qualify decision-maker, AI use cases, current governance records, owners, urgency, data sensitivity, geography and procurement/security requirements.
2. Demonstrate with synthetic/dedicated safe data only, or a deck/video if a secured demo runtime is unavailable. No customer production data, secrets or unsupported live claims.
3. Describe RISCK COMPLY as an AI-governance **readiness and evidence** workflow tool, not an AI Act certification, legal opinion, SOC 2/ISO 27001 certification, guaranteed regulatory approval, or proven risk elimination.
4. State clearly that availability, scope, security, privacy/DPA and commercial activation require verification before a binding customer commitment.

### Handoff stages and stop gates
`identified → qualified → contacted (approved outreach) → interested → demo scheduled → demo completed → fit/procurement review → proposal DRAFT → legal/tax/security approved → signed effective agreement → correctly invoiced/paid → tenant activation APPROVED`.

**Stop before effective contract, funds, live data or activation** if legal identity/authority, terms/DPA, applicable CAE/activity status, VAT treatment, invoice capability, Stripe identity if used, live security/tenant boundaries, production release evidence, or operational support remain unresolved. A manual transfer or payment link does not bypass those checks.

## 4. Copy-ready English outreach (manual approval required)

**Subject:** AI inventory and evidence workflows at [Company]

Hello [First name],

I saw [specific verifiable public fact about the company]. When AI use cases spread across teams, keeping an inventory, clear ownership, risk reviews and supporting evidence up to date can be difficult.

I'm working on RISCK COMPLY, a platform designed to help B2B teams organise AI governance readiness and reviewable evidence in one workflow.

Would a brief conversation about your current process be useful? Happy to share a short overview first.

Best,  
RISCK COMPLY  
comercial@risckcomply.com

Do not invent the public fact or imply the recipient has a compliance gap. Follow the recipient country's applicable direct-marketing rules and respect declines.

## 5. Buyer-safe response to inbound interest

**Subject:** Re: RISCK COMPLY — next steps

Hello [First name],

Thank you for your interest in RISCK COMPLY. We currently handle new business requests through an assisted process so we can understand your AI governance scope, implementation needs and procurement requirements.

Could you share the main workflow you want to improve (AI system inventory, risk ownership, policy/evidence review or vendor AI oversight) and your preferred country of contracting? We can then agree whether a short introductory call makes sense.

Pricing and implementation details are confirmed only after a scope and readiness review. We will not request sensitive AI system evidence over email at this stage.

Best,  
RISCK COMPLY  
comercial@risckcomply.com

## 6. Friday 20 November — release and customer-safety checklist

| Check | Current evidence/owner action | Status |
| --- | --- | --- |
| Mailing address sends/receives | Owner confirmed access; no app-driven delivery test | OWNER_CONFIRMED / RUNTIME_UNVERIFIED |
| Sales playbook and qualifying flow | Documents and this runbook prepared | SOURCE_PREPARED |
| Prices and customer-safe positioning | Canonical plans, no free-trial claim, no guaranteed AI Act compliance | SOURCE_PREPARED |
| Plan-specific public CTAs | GitHub PR #2748, subject to checks and review | NOT_DEPLOYED |
| Public domain / live marketing routes | Vercel billing/HTTP 402 issue and independent public smoke outstanding | BLOCKED_EXTERNAL |
| New lead form: POST, persistence, email notification | Historical test leads exist; new public end-to-end test needed | UNVERIFIED_END_TO_END |
| Safe production SaaS access | Critical security, tenant isolation, identity/MFA and release evidence outstanding | NO_GO |
| Final effective Terms, Order, DPA and supplier evidence | Review drafts only; legal/evidentiary authority outstanding | NOT_EFFECTIVE |
| SaaS CAE activity and VAT by territory | Owner deferred; cannot be treated as completed | TAX_REVIEW_REQUIRED |
| Stripe LIVE `individual` vs Lda, payment links, TEST lifecycle | Needs merchant identity/tax reconciliation and signed-webhook lifecycle tests | NOT_CLEARED |
| Manual TOConline SaaS invoice | Owner access confirmed; exact service and VAT/CAE suitability not yet validated | NOT_CLEARED |
| Customer onboarding and support | Source plan prepared; real tenant onboarding requires approved security/runtime tests | NO_GO |

**Friday go/no-go:** Recheck Vercel account state **after owner confirms payment**; verify domains and HTTP endpoints; complete independent PR/CI review; confirm qualified marketing lead form smoke without using real customer PII; do not publish an unsafe paid product. It is possible to open a **marketing-only** surface while paid SaaS access stays disabled, but only with appropriate site-level separation and verified operational routing.

## 7. Evidence and provenance boundary

- Three prior `public.sales_leads` rows observed in November checks are internally labelled test companies (created 2026-10-04); **zero genuine inbound prospects evidenced by those rows**.
- This document records owner decisions and source-level readiness only. It is not a regulatory, legal, tax, security, payment or launch sign-off.
- No emails sent, no new marketing automation, no paid API/enrichment credits, no live subscription changes, no customer data writes and no production release made in preparing this runbook.
