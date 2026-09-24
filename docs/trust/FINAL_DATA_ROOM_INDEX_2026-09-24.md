# RISCK COMPLY — Enterprise Buyer Data Room Index

Date: 2026-09-24  
Classification: `CONTROLLED_INDEX / PUBLIC_REPOSITORY_SAFE`  
Status: `BUYER_DILIGENCE_INTERNAL_READY / COUNTERPARTY_ACCEPTANCE_EXTERNAL`

This index supersedes the 2026-09-12 buyer-sharing index for current diligence preparation. Historical evidence remains historical; it is not silently rewritten.

The public repository stores safe indices and non-confidential diligence material only. Confidential third-party reports, credentials, customer records, privileged legal advice, tax/registry documents and provider-account secrets remain in controlled channels.

## 0. Buyer quick-start

| Buyer need | Start here |
| --- | --- |
| Product summary | `docs/sales/one-pager.md` |
| Executive pitch | `docs/sales/pitch-deck-short.md` |
| Product demo | `docs/sales/demo-script-10-min.md` |
| Pricing | `config/billing-commercial-catalog.json` |
| Onboarding | `docs/sales/enterprise-onboarding-plan.md` |
| Security questionnaire | `/{locale}/trust/security-questionnaire` and `/api/trust/security-questionnaire` |
| Architecture | `docs/trust/ARCHITECTURE_OVERVIEW.md` and `docs/trust/ENTERPRISE_ARCHITECTURE_DIAGRAM.md` |
| Procurement | `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md` and `/{locale}/trust/procurement-pack` |
| Legal/privacy posture | `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md` |
| Buyer-readiness matrix | `docs/sales/ENTERPRISE_BUYER_READINESS_2026-09-24.md` |
| Canonical buyer Q&A | `docs/trust/ENTERPRISE_BUYER_DUE_DILIGENCE_QA.md` |
| First 48 hours handoff | `docs/trust/BUYER_FIRST_48_HOURS_HANDOFF.md` |

## 1. Company and contracting facts

Repository-safe:

- owner legal decisions and contracting model documentation;
- public product/company contact surfaces;
- legal/privacy review package.

Controlled outside public repository when required:

- authoritative registry extract;
- VAT/tax-regime proof;
- signatory/officer evidence;
- bank/payment details;
- signed customer/order documents.

Do not substitute owner statements for authoritative registry/tax evidence where a buyer requires official proof.

## 2. Product and commercial package

- `docs/sales/README.md`
- `docs/sales/one-pager.md`
- `docs/sales/pitch-deck-short.md`
- `docs/sales/demo-script-10-min.md`
- `docs/sales/commercial-faq.md`
- `docs/sales/enterprise-onboarding-plan.md`
- `config/billing-commercial-catalog.json`
- `docs/enterprise/ENTERPRISE_PRICING_AND_BILLING_ARCHITECTURE.md`

Canonical public reference:

- Essential €49/month;
- Professional €149/month;
- Business €399/month;
- Enterprise from €990/month, final price by contract;
- no free trial currently offered.

## 3. Architecture and product controls

- `docs/trust/ARCHITECTURE_OVERVIEW.md`
- `docs/trust/ENTERPRISE_ARCHITECTURE_DIAGRAM.md`
- `docs/trust/ACCESS_CONTROL.md`
- `docs/trust/SECURITY_OVERVIEW.md`
- `docs/security/`
- applicable architecture decisions under `docs/architecture/decisions/`

Release/runtime claims remain bound to the accepted evidence for the relevant SHA/environment.

## 4. Security and assurance

- public Security/Trust surfaces;
- `docs/trust/SECURITY_OVERVIEW.md`;
- `docs/trust/INCIDENT_RESPONSE.md`;
- `docs/trust/PENTEST_READINESS.md`;
- security CI/release evidence.

Third-party assessment boundary:

- black-box web application assessment completed: 2026-09-12;
- confidential attributable report exists outside the public repository;
- original TLS Highs have technical remediation/external validation evidence;
- clean independent retest/terminal assurance remains open.

Do not call this SOC 2, ISO 27001, a clean pentest pass or authenticated tenant-isolation certification.

## 5. Privacy, GDPR, DPA, subprocessors and transfers

- `docs/trust/DATA_PROTECTION.md`
- `docs/trust/DPA_DRAFT.md`
- `docs/trust/SUBPROCESSORS.md`
- `docs/legal-assurance/ROPA.md`
- `docs/legal-assurance/PRIVACY_ART13_14_MATRIX.md`
- `docs/legal-assurance/DPA_ARTICLE_28_CONTROL_MATRIX.md`
- `docs/legal-assurance/INTERNATIONAL_TRANSFER_REGISTER.md`
- `docs/trust/PROCUREMENT_LEGAL_PRIVACY_CLOSURE_2026-09-24.md`

Privacy/Terms/DPA review surfaces are not represented as effective signed contracts until the applicable final publication/incorporation facts are closed.

## 6. AI Act / AI governance documentation

- `docs/legal-assurance/CURRENT_LEGAL_AUTHORITY.md`
- `docs/legal-assurance/LEGAL_APPLICABILITY_MATRIX_V2_2026-09-14.md`
- `docs/compliance/`
- current feature/route inventory under legal-review preparation;
- product assessment/FRIA/governance evidence where applicable.

Current product-scope conclusions are change-trigger controlled. They are not a guarantee of a customer's compliance.

## 7. Procurement and buyer questionnaire

- `docs/trust/ENTERPRISE_PROCUREMENT_PACKET.md`
- `docs/trust/PROCUREMENT_CHECKLIST.md`
- `docs/trust/SECURITY_QUESTIONNAIRE_OPERATING_GUIDE.md`
- `src/lib/trust/security-questionnaire.ts`
- `src/lib/trust/procurement-pack.ts`
- `docs/trust/ENTERPRISE_BUYER_DUE_DILIGENCE_QA.md`
- `docs/trust/BUYER_FIRST_48_HOURS_HANDOFF.md`
- public Trust Center / procurement pack / questionnaire endpoints.

These materials support diligence; they are not certifications or buyer acceptance.

## 8. Incident, continuity and operations

- `docs/trust/INCIDENT_RESPONSE.md`
- `docs/trust/BACKUP_AND_RECOVERY.md`
- release/security runbooks and status surfaces.

Numeric uptime, RTO/RPO, service-credit and 24/7 human-response commitments require applicable signed terms and operational evidence.

## 9. Billing and commercial evidence

Repository:

- canonical billing catalog;
- billing architecture;
- server-side billing/entitlement controls;
- provider-safe public pricing.

Controlled/provider evidence when required:

- live Stripe product/price binding;
- signed webhook evidence;
- legitimate customer subscription/invoice lifecycle;
- tax/VAT configuration;
- customer-specific Enterprise order/quote.

Synthetic fixtures must never be represented as real customers or revenue.

## 10. Evidence-sharing rules

Before sending a controlled data room to a buyer:

1. identify the buyer and diligence purpose;
2. share only the minimum relevant evidence;
3. remove secrets/customer identifiers/internal provider identifiers;
4. keep privileged legal advice and raw security reproduction details restricted;
5. record the release/SHA/environment for runtime claims;
6. distinguish current evidence from historical evidence;
7. do not upgrade open external items to PASS because a document exists.

## 11. Terminal buyer-readiness state

```text
PRODUCT_ONE_PAGER=PASS
SALES_DECK=PASS
DEMO_SCRIPT=PASS
PRICING_SOURCE_OF_TRUTH=PASS
ENTERPRISE_ONBOARDING_PLAN=PASS
SECURITY_QUESTIONNAIRE=PASS
ARCHITECTURE_PACKAGE=PASS
PROCUREMENT_PACK=PASS_INTERNAL
LEGAL_PRIVACY_PROCUREMENT_PACKAGE=PASS_INTERNAL
CONTROLLED_DATA_ROOM_INDEX=PASS_INTERNAL
BUYER_ACCEPTANCE=EXTERNAL
SIGNED_CUSTOMER_CONTRACT=EXTERNAL
CUSTOMER_LOGOS_OR_TESTIMONIALS=NOT_CLAIMED
```

The internal buyer-readiness package is complete when its CI/public-claims/security gates pass. Actual buyer acceptance remains an external commercial event.
