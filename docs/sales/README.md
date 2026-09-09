# RISCK COMPLY — Enterprise Sales Kit

This folder is the source of truth for GTM positioning, sales demos, discovery calls, outbound messaging, buyer enablement and enterprise FAQ responses.

## Commercial truth boundary

As of **2026-09-09**, the canonical commercial motion is:

- Essential: €49/month, self-serve monthly checkout;
- Professional: €149/month, self-serve monthly checkout;
- Business: €399/month, assisted sales;
- Enterprise: from €990/month, final price by contract;
- **no free trial is currently offered**;
- taxes/VAT are not represented as conclusively determined until the applicable customer/transaction treatment is established;
- no legal, certification, audit or regulatory approval claim may exceed current Trust Center and signed-contract evidence.

`enterprise-gtm-playbook.md`, `config/billing-commercial-catalog.json`, `docs/enterprise/ENTERPRISE_PRICING_AND_BILLING_ARCHITECTURE.md` and `src/lib/i18n/pricing-commercial-truth.ts` must remain aligned with this boundary.

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
- Do not claim SOC 2, ISO 27001 certification, third-party pentest completion or guaranteed legal compliance unless the signed contract and Trust Center evidence explicitly support it.
- Position RISCK COMPLY as an operational AI governance readiness system for inventory, risk, policy, evidence, workflow, visibility and review preparation.
- Enterprise commitments must be tied to contract, DPA, subprocessor list, support terms and security evidence.
