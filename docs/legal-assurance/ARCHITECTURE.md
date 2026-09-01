# RISCK COMPLY Legal Assurance — Enterprise V1 Architecture

Status: **repository implementation in progress / external legal validation pending**  
Feature flag: `LEGAL_ASSURANCE_ENABLED=false` by default  
Commercial default: `DIRECT_COUNSEL`  
Production enablement: **not authorised by this document**

## 1. Purpose

Legal Assurance is an optional Enterprise workflow that lets a RISCK COMPLY customer prepare a bounded governance matter and escalate that matter to independent qualified external Counsel.

RISCK COMPLY performs operational preparation, evidence organisation, deterministic integrity checks, workflow routing and remediation tracking. External Counsel retains conflict, engagement, professional judgment, scope, conditions, exclusions and legal conclusion authority.

This feature does **not** make RISCK COMPLY a law firm, regulator, notified body, certification authority or substitute for professional legal judgment.

## 2. Truth boundary

Engineering completion is not external legal approval.

The following remain external states until genuine evidence exists:

- `LAW_FIRM_PARTNER=PENDING`
- `EXTERNAL_COUNSEL_VALIDATION=PENDING`
- `PROFESSIONAL_RULES_VALIDATION=PENDING`
- `LEGAL_COMMERCIAL_VALIDATION=PENDING`
- `PUBLIC_COUNSEL_CLAIMS=PENDING`
- `PRODUCTION_COUNSEL_ENABLEMENT=PENDING`

No code path may infer these states from a database row, synthetic fixture, feature flag or test account.

## 3. Existing architecture reused

The implementation deliberately extends existing RISCK COMPLY primitives instead of creating a competing platform:

- Next.js server APIs;
- Supabase/Postgres;
- canonical active-membership RLS helpers;
- organization-scoped RBAC;
- Enterprise plan authority;
- AI-system inventory;
- FRIA;
- central chained audit events;
- distributed rate limiting;
- trusted-origin checks;
- `no-store` sensitive responses;
- existing Enterprise visual components.

Existing FRIA fields such as `legal_reviewer_id`, `legal_review_required` and `legal_review_completed_at` remain an **internal organisation workflow**. They are not treated as a qualified external opinion.

## 4. Feature gate

Authoritative server gate:

```text
LEGAL_ASSURANCE_ENABLED=true|false
```

Anything other than the exact enabled value is treated as disabled.

When disabled:

- customer APIs return unavailable;
- Counsel APIs return unavailable;
- the customer hub cannot create a review;
- the Counsel portal cannot expose customer matter data;
- package generation cannot occur through feature APIs;
- no billing or public availability claim is created.

Package generation additionally fails closed unless the server provides:

```text
VERCEL_GIT_COMMIT_SHA
LEGAL_ASSURANCE_METHODOLOGY_VERSION
LEGAL_ASSURANCE_REGULATORY_RULES_VERSION
```

The release SHA must be a 40-character hexadecimal Git commit identity.

## 5. Domain model

### Firms and Counsel

- `law_firms`
- `law_firm_capabilities`
- `counsel_profiles`

Authentication and professional verification are separate. A signed-in user is not automatically verified Counsel.

A verified Counsel profile must be active and associated with a law firm. Law-firm activation and professional verification are administrative/external evidence operations, not customer-controlled actions.

### Matters

- `legal_review_requests`
- `legal_review_access_grants`

A Legal Review belongs to one customer organisation and may bind one AI system or a bounded organisational scope.

External Counsel does **not** become a customer `owner`, `admin` or `member`. Access derives from an explicit matter grant.

### Evidence integrity

- `legal_review_packages`
- `legal_review_package_items`

Each package captures:

- review identity and scope;
- organisation identity;
- AI-system identity and server snapshot when present;
- FRIA snapshot when explicitly referenced;
- product release SHA;
- methodology version;
- regulatory-rules version;
- package version;
- stable item identifiers;
- SHA-256 item digests;
- SHA-256 manifest digest;
- known limitations and open gaps.

A digest proves package identity/integrity. It does **not** prove legal correctness.

### Professional decisions

- `legal_review_decisions`
- `legal_review_artifacts`

Decision values are bounded to:

```text
ACCEPTED
ACCEPTED_WITH_CONDITIONS
REMEDIATION_REQUIRED
REJECTED
OUTSIDE_SCOPE
```

Issued decisions are immutable. A later decision supersedes the prior decision rather than editing history.

### Remediation and information

- `legal_review_remediation_items`
- `legal_review_information_requests`
- `legal_review_information_responses`

Information requests gather missing facts without forcing a legal conclusion. Remediation findings create structured customer work followed by a versioned resubmission.

## 6. State machine

Canonical matter states:

```text
DRAFT
REQUESTED
CONFLICT_CHECK_PENDING
DECLINED
ENGAGEMENT_PENDING
ACCEPTED_FOR_REVIEW
PACKAGE_PREPARING
READY_FOR_REVIEW
IN_REVIEW
INFORMATION_REQUESTED
REMEDIATION_REQUIRED
RESUBMITTED
COMPLETED
CANCELLED
EXPIRED
SUPERSEDED
```

Critical mutations are server-authoritative and concurrency guarded with the expected prior `updated_at` value plus row locking.

Representative lifecycle:

```text
REQUESTED
→ CONFLICT_CHECK_PENDING
→ ENGAGEMENT_PENDING
→ ACCEPTED_FOR_REVIEW
→ PACKAGE_PREPARING
→ READY_FOR_REVIEW
→ IN_REVIEW
→ REMEDIATION_REQUIRED
→ RESUBMITTED
→ PACKAGE_PREPARING
→ READY_FOR_REVIEW
→ IN_REVIEW
→ COMPLETED
```

Illegal transitions fail closed.

## 7. Conflict and engagement gates

Conflict and engagement are Counsel-controlled gates.

RISCK COMPLY records workflow state and evidence references but does not decide whether a professional conflict exists or whether a lawyer-client relationship has been created.

Before full review access:

1. a legitimate partner firm and verified Counsel profile must exist;
2. the matter must be explicitly assigned;
3. Counsel performs/records conflict acceptance or declines;
4. engagement must be affirmatively accepted with an engagement reference;
5. the matter-scoped grant advances to review scope.

A decline revokes active matter access.

## 8. Matter-scoped RLS

Legal Assurance tables use RLS and `FORCE ROW LEVEL SECURITY`.

Authenticated browser clients receive SELECT only where an RLS policy proves authority. Browser INSERT/UPDATE/DELETE authority is revoked for the Legal Assurance data plane.

Customer access is derived from canonical active organisation membership.

Counsel access requires:

- current authenticated identity matching one Counsel profile;
- Counsel profile `VERIFIED` and active;
- active explicit grant for the exact review;
- grant law firm matching the Counsel law firm;
- grant not revoked.

This prevents a Counsel account from obtaining implicit access to:

- organisation settings;
- billing;
- user management;
- unrelated AI systems;
- unrelated documents;
- unrelated reviews;
- another customer;
- another law firm's matters.

## 9. Backend-only professional authority

Database RPCs that change professional workflow are revoked from:

```text
public
anon
authenticated
```

and executable only by the trusted backend `service_role`.

Examples include:

- Counsel assignment;
- conflict/engagement gates;
- atomic review transitions;
- package creation/finalisation;
- information-request state changes;
- decision issuance;
- remediation updates;
- resubmission.

The service role is never exposed to the browser.

## 10. Customer server authority

Customer Legal Assurance APIs independently resolve:

- authenticated user;
- current organisation;
- active organisation RBAC;
- Enterprise commercial authority;
- review ownership;
- AI-system ownership;
- current matter state.

The browser is not trusted to assert `organization_id`, law firm, Counsel identity, entitlement, package identity, legal status or decision authority.

Mutating endpoints use trusted-origin checks, Zod schemas, bounded request sizes, distributed rate limits and `no-store` responses.

## 11. Counsel server authority

Counsel APIs independently resolve:

- authenticated user;
- current active `VERIFIED` Counsel profile;
- Counsel law firm;
- explicit active matter grant;
- assigned review;
- latest frozen package;
- current matter state.

A professional decision digest is generated server-side and binds the decision payload to:

- review ID;
- package ID/version/digest;
- law-firm ID;
- Counsel profile ID;
- decision;
- scope;
- jurisdiction;
- rationale;
- conditions;
- exclusions;
- validity;
- signed-artifact reference when present;
- remediation items when present.

## 12. Immutability and package versioning

A package may be edited only before finalisation. Once `finalized_at` exists, triggers reject package update/delete and package-item mutation.

Counsel decisions reject update/delete entirely.

Customer changes after review begins produce a new package version:

```text
Package V1 → Counsel review
Customer remediation
Package V2 → Counsel delta/re-review
```

Historical packages remain intact.

## 13. Delta review

The server provides deterministic item comparison using stable identifiers and content digests:

```text
ADDED
CHANGED
REMOVED
UNCHANGED
```

RISCK COMPLY may return a mechanical recommendation:

```text
NO_REVIEW
LIMITED_REVIEW
FULL_REVIEW
```

Counsel always retains the professional override. The recommendation is not a legal conclusion.

## 14. Auditability

Critical server routes use the existing chained central audit service.

Safe events include equivalents of:

- `LEGAL_REVIEW_REQUESTED`
- `CONFLICT_CHECK_ACCEPTED`
- `MATTER_DECLINED`
- `ENGAGEMENT_ACCEPTED`
- `REVIEW_PACKAGE_CREATED`
- `REVIEW_PACKAGE_FROZEN`
- `COUNSEL_REVIEW_STARTED`
- `INFORMATION_REQUESTED`
- `INFORMATION_PROVIDED`
- `REMEDIATION_REQUESTED`
- `REMEDIATION_UPDATED`
- `REVIEW_RESUBMITTED`
- `COUNSEL_DECISION_ISSUED`

Professional decision issuance performs an audit-intent write before the immutable decision mutation and a final audit write after it. If the final audit cannot be persisted, the API does not report success and emits only safe reconciliation identifiers to operational logs.

Full legal rationale, confidential opinions and customer evidence are not copied into audit metadata.

## 15. Notifications

Existing RISCK COMPLY notifications are organisation-scoped. They can safely support customer-side in-app Legal Assurance notifications after product integration.

They are **not** reused as a shortcut for external Counsel because Counsel is deliberately not a customer organisation member. V1 Counsel notification is the matter-scoped Counsel inbox. A future Counsel notification channel must preserve the same independent identity boundary.

No external email is sent by this implementation. `EMAIL_SEND_AUTHORIZED=false` remains authoritative for this work.

## 16. Privacy and confidentiality

Legal-review content is treated as highly sensitive.

Architecture principles:

- least privilege;
- tenant and matter scoping;
- no confidential opinions in Git;
- no confidential opinion text in operational logs or analytics;
- signed artifacts referenced from private storage only;
- short-lived authorised download mechanisms required before Production artifact download is enabled;
- retention/legal hold remains jurisdiction/engagement dependent rather than hard-coded universally.

The product does not claim that using RISCK COMPLY automatically creates legal professional privilege.

## 17. Commercial boundary

Safe default:

```text
DIRECT_COUNSEL
```

Meaning:

```text
RISCK COMPLY invoices software.
Law Firm invoices legal services.
```

The schema can represent future `CONTRACTUAL_BUNDLE` and `PLATFORM_COORDINATED` modes, but those modes remain inactive until qualified professional-regulatory review.

No percentage fee sharing, referral commission, Stripe Connect split or hard-coded legal fee is implemented.

## 18. FRIA boundary

The current FRIA internal legal-review workflow remains backward compatible.

A future policy may rely on a qualified external decision only when all of the following can be proven:

- scope matches;
- package matches;
- decision is current and not expired;
- Counsel identity is genuinely verified;
- professional engagement is valid;
- applicable policy permits reliance.

A customer checkbox or internal `legal_review_completed_at` value never upgrades itself into external qualified legal review.

## 19. Failure model

Important actions fail closed:

- disabled feature → unavailable;
- missing server release configuration → package generation denied;
- unresolved tenant authority → denied;
- unresolved Counsel authority → denied;
- revoked/unassigned matter → denied;
- stale `updated_at` → state conflict;
- illegal transition → denied;
- missing engagement → package denied;
- package not frozen → review/decision denied;
- missing remediation → remediation decision denied;
- audit unavailable on critical workflow → success is not reported.

## 20. Remaining technical work before owner-controlled completion

Repository acceptance still requires CI/runtime evidence for the feature branch and completion of any red checks caused by this implementation.

The following should not be marked PASS merely from architecture existence:

- Production Supabase migration application;
- real secure signed-artifact upload/download runtime;
- full synthetic E2E lifecycle against an ephemeral database;
- notification UX for all customer events;
- production environment configuration;
- Production feature enablement.

## 21. External decisions

The following cannot be resolved by engineering:

- partner-law-firm acceptance;
- professional-independence validation;
- conflict process requirements;
- engagement structure;
- professional-liability allocation;
- cross-border service restrictions;
- controller/processor roles for Counsel content;
- privilege/confidentiality treatment;
- public use of firm name/logo;
- signed-opinion formalities;
- permitted commercial model and fee arrangements;
- allowed public claims.

**HUMAN_COUNSEL_REVIEW_REQUIRED**
