# RISCK COMPLY — Enterprise Buyer Readiness Terminal Pack

Date: 2026-09-24  
Scope: demo, pricing, onboarding, sales deck, security questionnaire, architecture diagram, product one-pager, procurement pack and controlled data room.  
Status: `ENTERPRISE_BUYER_READINESS_INTERNAL=PASS`

This document is the canonical index for customer/buyer enablement. It closes internally controllable preparation; it does not invent customer logos, revenue, buyer interest, certifications, legal approval, production evidence, or counterparty acceptance.

## Buyer journey

| Stage | Canonical asset | Internal state | Buyer-safe boundary |
| --- | --- | --- | --- |
| 1. First look | `docs/sales/one-pager.md` | PASS | Product/value summary; no unsupported compliance guarantee. |
| 2. Discovery | `docs/sales/discovery-call-checklist.md` | PASS | Qualifies pain, scope, buyer, procurement and implementation needs. |
| 3. Executive pitch | `docs/sales/pitch-deck-short.md` | PASS | Eight-slide narrative aligned to AI governance readiness. |
| 4. Product demo | `docs/sales/demo-script-10-min.md` | PASS | Demonstrates only implemented flows; synthetic demo data must be labelled as demo data. |
| 5. Pricing | `config/billing-commercial-catalog.json` | PASS_SOURCE_OF_TRUTH | Essential €49/mo, Professional €149/mo, Business €399/mo, Enterprise from €990/mo by contract. Annual repository references use ten monthly payments. |
| 6. Onboarding | `docs/sales/enterprise-onboarding-plan.md` | PASS | Assisted enterprise rollout plan; timeline depends on customer inputs/scope. |
| 7. Security review | `/{locale}/trust/security-questionnaire` + API export | PASS | Evidence-bound answers, caveats and same-origin evidence. |
| 8. Architecture review | `docs/trust/ARCHITECTURE_OVERVIEW.md` | PASS | Current architecture and trust boundaries; no certification implication. |
| 9. Procurement | `/{locale}/trust/procurement-pack` + `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md` | PASS_INTERNAL | Internal diligence pack; buyer acceptance remains external. |
| 10. Data room | `docs/trust/FINAL_DATA_ROOM_INDEX_2026-09-24.md` | PASS_CONTROLLED_INDEX | Safe index only; confidential evidence remains controlled outside public repo. |

## Canonical commercial truth

| Plan | Monthly | Annual repository reference | Motion |
| --- | ---: | ---: | --- |
| Essential | €49 | €490 | self-serve |
| Professional | €149 | €1,490 | self-serve |
| Business | €399 | €3,990 | assisted sales |
| Enterprise | from €990/month | contract | sales-led / negotiated |

No free trial is currently offered. Taxes/VAT are fact- and transaction-dependent. Enterprise starting price is a positioning reference, not a fixed public Stripe price or a promise that every contract costs €990.

## Demo acceptance

A buyer demo is internally ready when the presenter can show the implemented journey without fabricated production/customer proof:

1. login / workspace context;
2. AI system inventory;
3. risk/classification and owner context;
4. assessment/reassessment;
5. governance documents/evidence;
6. monitoring/review status;
7. security/trust/procurement surfaces;
8. plan/pricing boundary;
9. next-step onboarding plan.

Use synthetic or dedicated demo data only. Do not present synthetic records as real customers, live revenue, signed enterprise adoption or production incidents.

## Enterprise onboarding acceptance

The onboarding package must define:

- kickoff and success criteria;
- organization/workspace ownership;
- initial AI inventory import/manual entry;
- roles and permissions;
- risk/assessment baseline;
- documents/evidence setup;
- monitoring/review cadence;
- procurement/security handoff;
- training and operational handover;
- expansion criteria.

No fixed implementation SLA is promised unless a signed agreement defines one.

## Buyer-safe security/assurance answer

- No SOC 2 or ISO 27001 certification is claimed.
- A third-party black-box web application assessment completed on 2026-09-12.
- Original TLS High findings have technical remediation evidence.
- A clean independent retest/terminal assurance remains open.
- Security questionnaire answers remain evidence-bound and must not be upgraded beyond the current Trust Center.

## Architecture review package

Architecture review should include:

- browser/public/private route boundary;
- Next.js application/server boundary;
- Supabase Auth;
- organization/RBAC authorization;
- Supabase Postgres + forced RLS tenant boundary;
- private storage/document controls where applicable;
- Stripe server-side billing/webhook boundary;
- audit/event evidence;
- CI/security/release gates;
- active/conditional providers with provider-specific evidence boundaries.

## Controlled data-room policy

Public repository material is an index and diligence aid, not a place for:

- credentials or secrets;
- customer records;
- raw production exports;
- confidential pentest report body;
- privileged legal advice;
- tax/registry documents containing unnecessary sensitive data;
- provider-account screenshots with secrets/internal identifiers.

Controlled evidence can be referenced by safe metadata, date and digest where appropriate.

## Terminal status

```text
DEMO_INTERNAL_READY=PASS
PRICING_ALIGNMENT=PASS
ENTERPRISE_ONBOARDING_PACKAGE=PASS
SALES_DECK=PASS
SECURITY_QUESTIONNAIRE=PASS
ARCHITECTURE_REVIEW_PACKAGE=PASS
PRODUCT_ONE_PAGER=PASS
PROCUREMENT_PACK=PASS_INTERNAL
CONTROLLED_DATA_ROOM_INDEX=PASS_INTERNAL
CUSTOMER_LOGOS_TESTIMONIALS=NOT_CLAIMED
BUYER_ACCEPTANCE=EXTERNAL
SIGNED_ENTERPRISE_CONTRACT=EXTERNAL
ENTERPRISE_BUYER_READINESS_INTERNAL=PASS
```
