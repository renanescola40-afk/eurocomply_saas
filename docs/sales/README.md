# RISCK COMPLY — Enterprise Sales Kit

## Temporary assisted sales launch (20 November 2026)

Owner-approved marketing go-live target: **Friday 20 November 2026**, conditional on Vercel account recovery and public-route checks. During this temporary assisted-sales phase, public pricing CTAs for Essential and Professional request a plan-specific demonstration at `/{locale}/book-demo?plan=<plan>` instead of initiating automatic signup; Business and Enterprise remain sales-led. Canonical prices, entitlements, Stripe settings and private checkout routes are unchanged. The operating plan and go/no-go checklist are in [`ASSISTED_COMMERCIAL_LAUNCH_2026-11-20.md`](./ASSISTED_COMMERCIAL_LAUNCH_2026-11-20.md).

Marketing lead capture and demonstrations are distinct from permission to sign binding SaaS contracts, take customer funds, onboard regulated/customer data or grant live production access. Production remains NO_GO until legal, tax/billing, security and release prerequisites are verified.

This folder is the source of truth for GTM positioning, sales demos, discovery calls, outbound messaging, buyer enablement and enterprise FAQ responses.

## Commercial truth boundary

The **2026-09-24 historical operating motion** (superseded for public acquisition by the temporary assisted-sales process described above) was:

- Essential: €49/month, self-serve monthly checkout;
- Professional: €149/month, self-serve monthly checkout;
- Business: €399/month, assisted sales;
- Enterprise: from €990/month, final price by contract;
- **no free trial is currently offered**;
- taxes/VAT are not represented as conclusively determined until the applicable customer/transaction treatment is established;
- no legal, certification, audit or regulatory approval claim may exceed current Trust Center and signed-contract evidence.

The billing catalogue remains the source of truth for prices and entitlements. For the temporary launch, `src/lib/i18n/pricing-commercial-truth.ts` is authoritative for the public assisted-sales CTA/FAQ override; do not read the historical 2026-09-24 self-serve statements as the currently enabled payment flow.

## Manual demos — Friday assisted launch

The owner selected manual scheduling through `comercial@risckcomply.com`. A submitted demo form is **not** a confirmed appointment: the team proposes real availability by email, the buyer agrees to a slot, and only then is a meeting link/invitation confirmed. See [`ASSISTED_COMMERCIAL_LAUNCH_2026-11-20.md`](./ASSISTED_COMMERCIAL_LAUNCH_2026-11-20.md), section 3A, for the process and approved-to-draft English templates. No automated emails or calendar events have been sent.

## Ready-to-use assets

1. [`enterprise-gtm-playbook.md`](./enterprise-gtm-playbook.md) — full GTM source of truth covering positioning, ICP, sector personas, pricing, checkout/demo motion, pricing copy, objections, FAQ, enterprise sales page, security questionnaire copy, demo script, outbound, LinkedIn, one-page deck, ROI calculator outline and procurement checklist.
2. [`demo-script-10-min.md`](./demo-script-10-min.md) — 10-minute live demo flow for CFO, Compliance Manager, DPO or founder-led calls.
3. [`pitch-deck-short.md`](./pitch-deck-short.md) — short 8-slide pitch deck script.
4. [`one-pager.md`](./one-pager.md) — copy-ready one-pager for PDF/export.
5. [`commercial-faq.md`](./commercial-faq.md) — enterprise FAQ covering AI Act readiness boundaries, GDPR, data, security, pricing, onboarding and support.
6. [`comparison-manual-vs-risck-comply.md`](./comparison-manual-vs-risck-comply.md) — spreadsheet/manual process comparison.
7. [`roi-calculator.md`](./roi-calculator.md) — simple ROI calculator with formulas and example.
8. [`discovery-call-checklist.md`](./discovery-call-checklist.md) — qualification checklist for demo/discovery.
9. [`outbound-email-sequences.md`](./outbound-email-sequences.md) — outbound emails for CFO, Compliance Manager and DPO.
10. [`enterprise-onboarding-plan.md`](./enterprise-onboarding-plan.md) — assisted enterprise rollout and implementation handoff.
11. [`ENTERPRISE_BUYER_READINESS_2026-09-24.md`](./ENTERPRISE_BUYER_READINESS_2026-09-24.md) — canonical buyer-readiness terminal matrix.
12. [`../trust/ENTERPRISE_ARCHITECTURE_DIAGRAM.md`](../trust/ENTERPRISE_ARCHITECTURE_DIAGRAM.md) — buyer-review logical architecture diagram.
13. [`../trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md`](../trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md) — controlled enterprise diligence data-room index.

## Public GTM surfaces

- Main landing page: `/<locale>`
- Pricing page: `/<locale>/pricing`
- Enterprise sales page: `/<locale>/enterprise`
- Public demo capture: `/<locale>/book-demo`
- Lead API: `/api/leads`
- Security questionnaire center: `/<locale>/security-questionnaire`
- Printable one-pager: `/sales/risck-comply-one-pager.html`

## Internal Sales Console

- Path: `/<locale>/admin/sales/leads`
- Purpose: private Early Access demo follow-up for the RISCK COMPLY team.
- Boundary: not a customer-facing product module.
- Language: use “Sales Console”, “Lead Operations”, “Demo Pipeline” or “Early Access Pipeline”.
- Access runbook: [`../ops/SALES_CONSOLE_ACCESS.md`](../ops/SALES_CONSOLE_ACCESS.md).

## Positioning

**RISCK COMPLY helps European companies prepare AI governance evidence by organizing AI systems, risk, owners, policies and review-ready records in one workspace.**

## Sales rules

- Do not claim guaranteed EU AI Act compliance, legal approval or regulator endorsement.
- Do not present RISCK COMPLY as legal advice or a replacement for lawyers, DPOs, security teams or auditors.
- Do not claim SOC 2, ISO 27001 certification, a clean independent pentest pass or guaranteed legal compliance unless current Trust Center evidence and the applicable signed contract support it. A third-party black-box assessment completed on 2026-09-12; its clean independent retest/terminal assurance remains open.
- Position RISCK COMPLY as an operational AI governance readiness system for inventory, risk, policy, evidence, workflow, visibility and review preparation.
- Enterprise commitments must be tied to contract, DPA, subprocessor list, support terms and security evidence.
