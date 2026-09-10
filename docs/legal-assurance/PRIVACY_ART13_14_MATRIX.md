# RISCK COMPLY — GDPR Articles 13/14 Privacy Matrix

Date: 2026-09-10  
Baseline: Regulation (EU) 2016/679, Articles 13 and 14  
Status model: PASS / FAIL / BLOCKED / NOT_TESTED / NOT_APPLICABLE / PENDING_EXTERNAL_REVIEW

This matrix tests the review draft and public Privacy surface requirement-by-requirement. A route existing is not evidence of legal completeness. Official-source verification is recorded in `GDPR_OFFICIAL_SOURCE_REGISTER_2026-09-09.md`.

## Matrix

| Requirement | GDPR | Current source/evidence | State | Gap / closure action |
|---|---|---|---|---|
| Controller identity | 13(1)(a), 14(1)(a) | Current external-assurance authority keeps `RISCK_COMPLY_CONTRACTING_ENTITY=UNDECIDED` / `RISCK_COMPLY_OPERATOR_ENTITY=UNDECIDED`; the public review draft now says the final legal entity/registered identifiers are pending rather than publishing the older proposed company identity as final | BLOCKED_ENTITY_FACTS_PUBLIC_FAIL_CLOSED | Owner must designate the operator/contracting entity and authoritative registry evidence must resolve registered identity/address/identifiers before final publication |
| Controller contact | 13(1)(a), 14(1)(a) | `comercial@risckcomply.com` is the verified privacy intake channel and is now present on the public review surface | PASS_PUBLIC_REVIEW_DRAFT | Final entity-linked legal notice mechanics remain separate |
| DPO contact, if applicable | 13(1)(b), 14(1)(b) | Article 37/CNPD screening result remains `DPO_REQUIRED=UNCERTAIN`; public draft explicitly makes no DPO appointment/requirement claim while facts are unresolved | BLOCKED_APPLICABILITY_FACTS_PUBLIC_FAIL_CLOSED | Resolve scale/sensitive-data/monitoring applicability facts; do not invent DPO/contact |
| Purposes | 13(1)(c), 14(1)(c) | Privacy review draft, RoPA/controller matrix and the public review surface describe account, service delivery, security, billing, support/business enquiries, essential communications and optional analytics purposes | PASS_PUBLIC_REVIEW_DRAFT | Keep synchronized with actual product/provider configuration |
| Legal bases | 13(1)(c), 14(1)(c) | `CONTROLLER_LEGAL_BASIS_MATRIX.md` maps candidate bases; public review surface explains the candidate contract/pre-contract, specific legal obligation, legitimate-interest and consent boundary without presenting them as final acceptance | PENDING_EXTERNAL_REVIEW_PUBLIC_FAIL_CLOSED | Qualified review must approve the actual basis allocation before final legal publication |
| Legitimate interests | 13(1)(d), 14(2)(b) | Pre-review LIAs cover security/abuse prevention, incident-response evidence and narrow B2B relationship administration; public review surface identifies that bounded scope and excludes automatic analytics/marketing credit | PARTIAL_PASS_PRE_REVIEW_PUBLIC_BOUNDARY | Final Art. 6(1)(f) allocations remain external-review dependent |
| Recipients/categories | 13(1)(e), 14(1)(e) | Public review surface now discloses provider categories (hosting, database/auth, payment, observability, analytics, email/support, professional services) and points to the active-provider/subprocessor reconciliation boundary | PARTIAL_PASS_PUBLIC_CATEGORIES_PROVIDER_FACTS_OPEN | Reconcile exact active Production providers, roles, account contracts and final subprocessor list |
| International transfers / safeguards | 13(1)(f), 14(1)(f) | Public review surface discloses Supabase Production `eu-west-1 (Ireland)`, warns that other providers may use additional/global locations and explicitly does not claim final adequacy/SCC/TIA acceptance; transfer register provides internal structure | PARTIAL_PASS_PUBLIC_BOUNDARY_PROVIDER_EVIDENCE_OPEN | Attach account-specific locations/DPA/adequacy/SCC/TIA evidence and obtain qualified transfer/legal-role conclusions where required |
| Retention period / criteria | 13(2)(a), 14(2)(a) | Public review surface now states the category-specific retention model and its purpose/customer/statutory/security/provider/deletion criteria; exact-SHA Data Governance V2 validates the bounded category-specific schema | PARTIAL_PASS_PUBLIC_CRITERIA | Final category periods for account, support, audit/security, analytics and provider backup/log classes still need factual/legal acceptance; technical schema proof is not legal-duration approval |
| Data-subject rights | 13(2)(b), 14(2)(c) | Public review surface lists access, rectification, erasure, restriction, objection, portability and consent withdrawal, provides `comercial@risckcomply.com`, explains customer-controller routing; exact-SHA Data Governance V2 run `34448768687` retained `Complete/passed` evidence | PASS_PUBLIC_REVIEW_DRAFT_EXACT_SHA_RUNTIME_GATE | #2009 can close after canonical reconciliation merges; downstream provider effects and case-specific legal decisions remain separate |
| Withdrawal of consent | 13(2)(c), 14(2)(d) | Public Privacy review surface embeds `AnalyticsConsentControls`; source defaults analytics to consent-required, gates PostHog and supports later withdrawal/opt-out | PASS_SOURCE_AND_PUBLIC_CONTROL_RUNTIME_CONFIG_OPEN | Retain exact Production analytics configuration/runtime evidence and obtain final ePrivacy/GDPR legal-basis review; other consent-based processing remains separate |
| Complaint to supervisory authority | 13(2)(d), 14(2)(e) | Public review surface states the right to complain to the competent data-protection supervisory authority | PASS_PUBLIC_REVIEW_DRAFT | Lead-authority/cross-border establishment position remains tied to final operator/entity facts |
| Statutory/contractual/product requirement and consequences | 13(2)(e) | Public review surface distinguishes account/auth requirements, paid-checkout requirements, optional analytics and the rule that product-required fields are not called statutory unless law requires them | PASS_PUBLIC_REVIEW_DRAFT | Keep exact fields/consequences synchronized with product flows and final legal basis |
| Automated decision-making/profiling | 13(2)(f), 14(2)(g) | Public review surface states that website/account processing is not intended to make solely automated legal/similarly significant decisions and separates customer use of product outputs | PASS_PUBLIC_REVIEW_DRAFT | Revalidate on product/account decisioning change |
| Categories of personal data for indirect collection | 14(1)(d) | Public review surface describes account/auth, workspace/content, billing, support/security/diagnostic and optional analytics categories; Article 14 register maintains per-flow structure | PASS_PUBLIC_REVIEW_DRAFT | Keep per-flow mapping synchronized with integrations and actual provider configuration |
| Source of personal data | 14(2)(f) | Public review surface identifies direct collection plus organisation administrators, identity/payment providers, support/security reporters, authorised integrations and customer uploads | PASS_PUBLIC_REVIEW_DRAFT | Only represent a source as active when the corresponding flow exists |
| Timing / delivery of Article 14 notice | 14(3) | `ARTICLE14_INDIRECT_COLLECTION_REGISTER.md` records one-month / first-communication / first-disclosure rules; V3 invitation template implements source/purpose/privacy-link disclosure in first teammate invitation | PARTIAL_PASS_IMPLEMENTED | Invitation path and remaining indirect controller-side flows still require canonical runtime/evidence binding; public Privacy content no longer blocks the notice link structurally |
| Article 14 exceptions | 14(5) | Article 14 register defines attributable exception decisions and approves no blanket exception; public review surface explicitly says no blanket indirect-collection exception is assumed | PASS_STRUCTURE_PUBLIC_BOUNDARY_NO_EXCEPTION_ASSUMED | Only accept an exception for a concrete case with facts, legal basis and safeguards |

## Public-page finding

The previous `/[locale]/privacy` route only rendered the short Trust Center Privacy summary and was materially narrower than Articles 13/14.

The Privacy implementation branch replaces that summary-only route with a versioned `PublicLegalReviewPage` that:

- remains visibly `REVIEW_DRAFT · HUMAN_REVIEW_REQUIRED`;
- publishes the verified privacy contact without inventing the unresolved operator entity;
- covers scope/roles, categories, purposes, legal-basis review boundary, recipients, transfers, retention criteria, rights, consent withdrawal, required/optional data, sources, automated decision-making, security, complaints and changes;
- embeds persistent analytics consent controls;
- localizes the disclosure surface across supported product locales;
- deliberately preserves founder/provider/qualified-review blockers instead of converting them into legal claims.

Therefore:

```text
OFFICIAL_SOURCE_MAPPING=PASS
PRIVACY_REVIEW_DRAFT=SUBSTANTIALLY_MAPPED
PUBLIC_PRIVACY_ART13_14_STRUCTURE=PASS_SOURCE_IMPLEMENTED_REVIEW_DRAFT
PUBLIC_PRIVACY_CONTROLLER_IDENTITY=BLOCKED_ENTITY_FACTS_FAIL_CLOSED
PUBLIC_PRIVACY_LEGAL_BASES=PENDING_QUALIFIED_REVIEW_FAIL_CLOSED
PUBLIC_PRIVACY_PROVIDER_AND_TRANSFER_FACTS=PARTIAL_OPEN
PUBLIC_PRIVACY_DPO_APPLICABILITY=BLOCKED_FACTS_FAIL_CLOSED
CONTROLLER_PURPOSE_BASIS_STRUCTURE=PASS_PRE_REVIEW
LEGITIMATE_INTEREST_ASSESSMENTS=PASS_PRE_REVIEW_PARTIAL_SCOPE
ARTICLE13_2E_FACT_MAPPING=PASS_PUBLIC_REVIEW_DRAFT
ARTICLE14_SCENARIO_TIMING_STRUCTURE=PASS
ARTICLE14_INVITATION_DISCLOSURE_PATH=PASS_IMPLEMENTED_PRE_RUNTIME_BINDING
PORTUGUESE_FISCAL_RETENTION_PERIOD=PASS_INTERNAL_EVIDENCE
RETENTION_SCHEMA_RUNTIME_GATE=PASS_EXACT_SHA
DATA_SUBJECT_RIGHTS_RUNTIME_GATE=PASS_EXACT_SHA
ANALYTICS_CONSENT_SOURCE_CONTROL=PASS
ANALYTICS_CONSENT_PUBLIC_WITHDRAWAL=PASS_SOURCE_IMPLEMENTED
TRANSFER_STRUCTURE=PASS_PRE_REVIEW
RETENTION_STRUCTURE=PASS_PRE_REVIEW
PUBLIC_PRIVACY_ART13_14_COMPLETENESS=STRUCTURE_IMPLEMENTED_BLOCKED_FINAL_FACTS_AND_QUALIFIED_REVIEW
PRIVACY_ART13_14_MAPPING=BLOCKED_FINAL_ENTITY_PROVIDER_LEGAL_DECISIONS
```

## Closure sequence

1. merge the exact-SHA rights/runtime reconciliation and close technical issue #2009;
2. merge/test the public Privacy review surface without weakening its fail-closed publication state;
3. owner designates the actual RISCK COMPLY contracting/operator entity and authoritative registry evidence resolves identity facts;
4. qualified review validates final controller-side legal bases / legitimate-interest allocations and DPO applicability where required;
5. close active-provider recipients/transfers with account evidence and qualified transfer conclusions;
6. approve remaining non-fiscal retention criteria/provider rotation;
7. bind remaining Article 14 indirect flows to runtime notice evidence;
8. only after those facts/decisions are accepted, promote the review draft to final/effective Privacy text.

No internal source implementation, CI result, exact-SHA artifact, provider support statement or AI-generated conclusion substitutes for qualified external legal judgment.