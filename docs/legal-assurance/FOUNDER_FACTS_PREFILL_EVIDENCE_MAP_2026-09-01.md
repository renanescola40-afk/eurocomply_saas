# RISCK COMPLY — Founder Facts Prefill Evidence Map

Date: 2026-09-01  
Status: `OWNER_CONFIRMATION_REQUIRED`  
Legal effect: none  
Acceptance credit: none

## Purpose

Reduce founder/Counsel discovery work by separating facts that have current repository/runtime/public evidence from facts that cannot safely be inferred.

This file is **not** a completed founder-facts record. It must never be copied to an accepted evidence path or marked `FOUNDER_FACTS_CONFIRMED` without genuine owner/officer review, completion, exact-release binding and the required signed artifact/digest.

## A. Evidence-backed prefill candidates — owner must confirm

These values have current technical/public support and can be presented to the owner as prefill candidates. They are not owner assertions until confirmed.

| Founder-facts field / area | Evidence-backed candidate | Current boundary |
|---|---|---|
| `commercial.productionProductName` | `RISCK COMPLY` | Public product identity; owner confirmation still required. |
| `commercial.productionDomains` | `https://www.risckcomply.com` | Current canonical public Production domain; final exact release/domain set must be confirmed. |
| `aiLegalPositioning.serviceBoundaryConfirmed` | Compliance/governance operations and evidence preparation; not legal advice, certification or compliance guarantee | Repeated on Terms, Trust Center, Security and product surfaces; still requires authorised owner confirmation. |
| Public uptime posture | No hard public uptime percentage by default; Enterprise SLA is contract-specific | Current public SLA/security posture; does not define a signed customer commitment. |
| Hosting provider candidate | Vercel | Runtime/repository evidence exists; account-level contract/DPA/region facts remain separately reviewable. |
| Database/auth/storage provider candidate | Supabase | Active Production project observed; account-level contractual facts remain separate. |
| Production Supabase region | `eu-west-1` | Current connected Production project observation; owner/Counsel must decide how it is represented contractually. |
| Billing provider candidate | Stripe | Current provider/runtime evidence exists; exact contracting/DPA facts remain separate. |
| Observability provider candidate | Sentry | Current provider evidence exists; exact data/retention/contract facts remain separate. |
| Analytics provider candidate | PostHog | Current public/provider evidence exists; Production-project assurance alignment has residual evidence limitations. |
| Distributed rate-limit/security state provider candidate | Upstash Redis | Current technical evidence exists; contractual/account acceptance remains separate. |
| `securityOperations.certificationsAuditsPentests` | No SOC 2 report; ISO 27001 not complete; no completed third-party security assessment report currently claimed publicly | Negative/conservative public assurance fact; must be updated if external evidence changes. |
| `securityOperations.availabilityCommitment` | Public default intentionally avoids unsupported hard uptime promise | Signed Enterprise commitments remain owner/Counsel decision. |
| `securityOperations.incidentCommunication` | Public status/incident communication mechanism exists | Exact contractual notification targets remain unresolved. |
| `securityOperations.vulnerabilityDisclosureProcess` | Public vulnerability/security disclosure process exists | Exact legal/security contact designation must be confirmed. |
| `commercial.customerTypesAndExcludedUses` | B2B European governance/compliance use with security/unlawful/prohibited abuse restrictions | Exact target/customer exclusions remain an owner commercial decision. |
| `aiLegalPositioning.excludedUses` | Current Acceptable Use review draft prohibits unauthorized access, security bypass, unlawful activity, false certification/legal-opinion use and unauthorized data processing | Final contractual/legal wording requires owner + Counsel acceptance. |
| `dataProcessing.productionDataCategories` | Public Privacy surface identifies account/auth metadata, organization/workspace/role data, compliance documents/vendor/risk/audit/notification data | Final complete production taxonomy must be owner-confirmed. |
| Draft role allocation candidate | Customer as controller for uploaded personal data; RISCK COMPLY as processor when operating the service for the customer | This appears on the public DPA review draft and is **not** promoted here as a final legal conclusion. Qualified Counsel must approve/correct it. |
| `aiLegalPositioning.partnerCounselModel` | `DIRECT_COUNSEL` launch-safe default: RISCK COMPLY invoices software; law firm invoices legal services | Architecture/commercial safety default, not a signed commercial/legal decision. |
| Public claims default | No unsupported certification, regulator approval, legal advice, guaranteed compliance or law-firm endorsement | Current Public Claims Guard/public surfaces support this conservative default; final approved claims remain a Counsel/owner decision. |

## B. Do not prefill by inference — genuine owner/account/contract evidence required

The following remain intentionally unresolved unless a genuine source is supplied:

### Legal entity / officer

- registered legal name;
- company/VAT numbers;
- registered address;
- country of establishment as contracting operator;
- governing-law preference;
- designated legal/privacy/security/billing/support contacts;
- DPO/EU representative status and basis;
- authorised officer name/role/date;
- signed founder-facts artifact reference and digest.

### Commercial commitments

- exact active plans/billing commitments when contractually relevant;
- trial, renewal and cancellation rules;
- refunds;
- suspension/termination rights;
- data-export commitments;
- final Enterprise order form;
- final SLA/support commitments.

### Data protection / transfers

- final controller/processor allocation;
- complete retention schedule;
- final cross-border transfer mechanisms;
- account-specific DPAs/SCCs in force;
- deletion/DSR operating owner;
- provider-specific customer notification requirements.

### Provider account facts

For every provider, final acceptance still requires the applicable account-level facts: enabled Production service, contracting entity, purpose/data categories, region, transfer mechanism, DPA status, retention/deletion and notification duties.

Email, support and AI-provider production bindings must not be guessed when current attributable evidence is incomplete.

### AI customer-content processing

Do not infer whether an AI provider receives customer content, whether model training is enabled, or the final provider/downstream-provider allocation without current implementation/account evidence and owner/Counsel review.

## C. Owner confirmation contract

The owner/officer should use this evidence map only as a shortcut when completing `docs/legal-review-preparation/FOUNDER_FACTS_TEMPLATE.json`.

For each candidate they must either:

- confirm a concrete current value; or
- replace it with the correct value; or
- use the structured `NOT_APPLICABLE` object with a substantive rationale where genuinely applicable.

Plain `N/A`, `TBD`, `TODO`, `unknown`, `pending` and null do not close a field.

## D. Acceptance boundary

```text
PREFILL_EVIDENCE_MAP=READY
OWNER_CONFIRMATION=REQUIRED
SIGNED_FOUNDER_FACTS=NOT_CREATED
FOUNDER_FACTS_CONFIRMED=false
LEGAL_ACCEPTANCE_NOT_INFERRED=true
```

No identity, signature, contract, DPA, SCC, legal conclusion or professional approval is fabricated by this evidence map.
