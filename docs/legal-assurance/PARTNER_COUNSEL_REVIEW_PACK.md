# RISCK COMPLY — Partner Counsel Review Pack

**Purpose:** external professional review of the proposed RISCK COMPLY Legal Assurance operating model.  
**Status:** `HUMAN_COUNSEL_REVIEW_REQUIRED`  
**Important:** this document requests review. It does not state or imply that any law firm has approved, endorsed or partnered with RISCK COMPLY.

## 1. What RISCK COMPLY does

RISCK COMPLY is an Enterprise AI-governance and EU AI Act readiness platform. It helps organisations structure AI-system facts, role/risk classification, governance workflows, evidence, documentation, remediation and auditability.

For Legal Assurance, RISCK COMPLY proposes to perform the operational preparation layer only:

- collect and structure customer facts;
- prepare bounded review matters;
- freeze versioned evidence packages;
- identify gaps;
- route information requests and remediation;
- preserve package/decision identity and audit history.

RISCK COMPLY is not presented as a law firm, lawyer, regulator, notified body, certification authority or substitute for professional legal judgment.

## 2. What external Counsel does

External Counsel remains responsible for professional legal services, including where applicable:

- client acceptance;
- conflict checks;
- engagement terms;
- professional independence;
- jurisdiction and scope;
- legal analysis;
- conditions/exclusions;
- remediation requirements;
- legal conclusions;
- validity periods;
- signed opinions/review artifacts;
- professional obligations and liability.

The software cannot force Counsel to approve, alter Counsel's conclusion, suppress adverse findings or automatically label a customer legally compliant.

## 3. Proposed client journey

```text
Customer governance work in RISCK COMPLY
→ optional Legal Review request
→ partner firm/Counsel assignment
→ Counsel conflict check
→ engagement acceptance
→ immutable review package V1
→ Counsel review
→ information request OR decision
→ remediation when required
→ immutable review package V2
→ Counsel re-review/delta review
→ final bounded decision/opinion
→ auditable historical record
```

## 4. Proposed Counsel journey

Counsel signs in under a distinct professional profile.

Counsel is **not** made a customer workspace owner, admin or normal member merely to gain access.

Counsel receives access only to explicitly assigned matters and approved package content.

Representative Counsel actions:

- accept/decline conflict gate;
- accept/decline engagement gate;
- start review;
- inspect frozen package and digest;
- request factual information;
- request remediation;
- issue `ACCEPTED`;
- issue `ACCEPTED_WITH_CONDITIONS`;
- issue `REJECTED`;
- issue `OUTSIDE_SCOPE`;
- provide validity period;
- attach/reference a genuine signed artifact when applicable.

## 5. Conflict handling

RISCK COMPLY does not decide whether a legal conflict exists.

The platform records a workflow state and Counsel action. Before full matter review, the proposed model requires a Counsel-controlled conflict gate. A declined matter revokes the active assignment.

**Counsel decision requested:** confirm whether this workflow is compatible with the firm's required conflict procedure and identify any information that must or must not be exposed before conflict clearance.

## 6. Engagement

A review request does not automatically create a lawyer-client relationship.

The proposed workflow includes a separate engagement gate. Full review access advances only after Counsel affirmatively records acceptance and an engagement reference.

RISCK COMPLY does not define the firm's engagement wording, scope, exclusions or fee terms.

**Counsel decision requested:** confirm the required client/engagement structure and whether RISCK COMPLY may coordinate the workflow without becoming the provider of legal services.

## 7. Data access

The proposed security model is matter-scoped.

External Counsel should not automatically gain access to:

- customer billing;
- customer settings;
- user management;
- unrelated AI systems;
- unrelated documents;
- unrelated reviews;
- another customer's data;
- another law firm's matters.

Access requires a verified active Counsel profile plus an explicit active grant for the exact review.

Customer users cannot mark a qualified external review complete by setting a boolean.

## 8. Evidence package

When a matter is prepared for Counsel, RISCK COMPLY creates an immutable package version containing server-side snapshots/references and integrity metadata.

Current package capability binds, where available:

- review scope;
- organisation;
- AI-system facts;
- risk/role/classification data;
- FRIA when explicitly referenced;
- product release SHA;
- methodology version;
- regulatory-rules version;
- stable item IDs;
- item SHA-256 digests;
- manifest SHA-256 digest;
- known limitations;
- open gaps.

The digest is an integrity/identity mechanism only. It is not represented as proof of legal correctness.

Customer changes after review begins create a new package version rather than silently changing the package Counsel reviewed.

## 9. Professional decisions

The proposed structured decision set is:

```text
ACCEPTED
ACCEPTED_WITH_CONDITIONS
REMEDIATION_REQUIRED
REJECTED
OUTSIDE_SCOPE
```

Each decision can bind:

- review/package identity;
- firm and Counsel identity;
- scope;
- jurisdiction;
- rationale;
- conditions;
- exclusions;
- issue date;
- validity;
- signed-artifact reference;
- decision digest;
- superseded decision.

Issued decisions are immutable. Corrections/revisions create a superseding decision.

**Counsel decision requested:** confirm whether these states and fields are sufficient and professionally appropriate, and identify jurisdiction-specific additions/restrictions.

## 10. Remediation

A `REMEDIATION_REQUIRED` decision creates structured findings containing a stable finding ID, title, required action and severity.

The customer can provide a structured response and mark an item ready for resubmission. Resubmission is blocked while required remediation remains incomplete.

A new immutable package version is then prepared. Counsel can compare changed package items rather than manually rediscovering the whole matter.

RISCK COMPLY can mechanically classify package changes as `ADDED`, `CHANGED`, `REMOVED` or `UNCHANGED` and may suggest `NO_REVIEW`, `LIMITED_REVIEW` or `FULL_REVIEW`; Counsel always controls whether that review scope is professionally sufficient.

## 11. Billing boundary

Safe proposed default:

```text
DIRECT_COUNSEL
```

Meaning:

```text
RISCK COMPLY invoices software.
Law Firm invoices legal services.
```

RISCK COMPLY has not implemented percentage fee sharing, referral commissions or Stripe Connect payment splitting for legal fees.

The architecture can later represent `CONTRACTUAL_BUNDLE` or `PLATFORM_COORDINATED`, but those modes are intentionally not approved or activated.

**Counsel decision requested:** confirm the professionally permissible relationship, billing model, referral/marketing constraints and any fee-sharing prohibitions for relevant jurisdictions.

## 12. Confidentiality and privilege

Legal-review content is treated as highly sensitive and matter-scoped.

The proposed product does not claim that use of RISCK COMPLY automatically creates legal professional privilege. Privilege/confidentiality consequences may depend on jurisdiction, engagement, participants and purpose.

Full opinion content is not intended for public Git, analytics or ordinary operational logs.

**Counsel decision requested:** specify confidentiality, privilege, retention, legal-hold and participant requirements that the product must enforce or explain.

## 13. Data protection

RISCK COMPLY needs Counsel input on the data-protection allocation for the legal-review workflow, including:

- whether the firm acts as independent controller, joint controller or processor for particular data flows;
- DPA/data-sharing terms;
- subprocessor implications;
- international/cross-border data transfers;
- retention/deletion restrictions;
- data-subject handling boundaries;
- professional secrecy constraints.

No universal data-controller/processor conclusion is asserted by this pack.

## 14. Public claims

The platform must not publish claims such as:

- EU AI Act Certified;
- EU Approved;
- Regulator Approved;
- Guaranteed Compliant;
- Fully Compliant;
- legal certification by RISCK COMPLY;
- RISCK replaces your lawyer.

Potential factual claims, only when genuine evidence exists, may describe:

- independent professional review;
- qualified external legal review;
- signed legal opinion;
- bounded status such as pending/in review/accepted/accepted with conditions.

A law-firm name/logo must not be displayed publicly without express permission.

**Counsel decision requested:** approve/rewrite the public terminology and define mandatory disclaimers.

## 15. Professional independence controls

RISCK COMPLY proposes that:

- Counsel can decline a matter;
- Counsel controls its legal conclusion;
- negative findings remain visible in the matter history;
- payment is not conditioned on a positive conclusion;
- software recommendations cannot override Counsel;
- one bounded accepted issue does not label the organisation globally compliant.

**Counsel decision requested:** confirm whether additional independence safeguards are required.

## 16. Questions requiring external Counsel approval

Please provide a professional view on:

1. Does the workflow preserve professional independence?
2. Who should be the legal-services client and how should engagement occur?
3. What conflict information may be exposed before conflict clearance?
4. Is `DIRECT_COUNSEL` the appropriate launch billing boundary?
5. Which public claims/disclaimers are permitted?
6. May RISCK COMPLY use the firm name/logo and under what conditions?
7. How should professional liability be allocated/described?
8. What are the data-controller/processor roles?
9. How should confidentiality and privilege be handled?
10. What formalities are required for signed opinions/reviews?
11. May professional registration information be displayed in the portal?
12. What retention/legal-hold requirements apply?
13. What cross-border legal-service restrictions apply?
14. Which review types require jurisdiction-specific limitations?
15. May RISCK COMPLY coordinate quotes/workflow without impermissible referral or fee-sharing effects?
16. Are the proposed decision statuses adequate?
17. Are package versioning and delta-review mechanics professionally acceptable?
18. What evidence should Counsel receive before conflict, after engagement and during review?

## 17. Current technical safeguards available for review

The feature branch currently contains:

- server feature flag default OFF;
- law-firm/Counsel domain model;
- professional verification state distinct from authentication;
- explicit matter grants;
- RLS + FORCE RLS;
- revoked authenticated mutation authority;
- backend-only lifecycle RPCs;
- conflict/engagement gates;
- immutable package and decision guards;
- package SHA-256 integrity;
- package versioning and delta primitives;
- customer Legal Assurance hub/API;
- Counsel inbox/API;
- structured information/remediation flows;
- audit-intent/final audit pattern for professional decisions;
- no external email sending;
- no Production enablement.

## 18. Requested outcome

The requested output from external Counsel is **not** a generic endorsement.

Please identify:

```text
APPROVED ELEMENTS
REQUIRED CHANGES
PROHIBITED ELEMENTS
JURISDICTION-SPECIFIC CONDITIONS
REQUIRED CONTRACT/DPA/ENGAGEMENT DOCUMENTS
APPROVED PUBLIC LANGUAGE
APPROVED COMMERCIAL BOUNDARY
PRODUCTION-ENABLEMENT CONDITIONS
```

Until that review occurs:

```text
HUMAN_COUNSEL_REVIEW_REQUIRED
EXTERNAL_COUNSEL_VALIDATION=PENDING
LAW_FIRM_PARTNER=PENDING
PRODUCTION_COUNSEL_ENABLEMENT=PENDING
```
