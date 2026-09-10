# RISCK COMPLY — GDPR Articles 13/14 Privacy Matrix

Date: 2026-09-10  
Baseline: Regulation (EU) 2016/679, Articles 13 and 14  
Status model: PASS / FAIL / BLOCKED / NOT_TESTED / NOT_APPLICABLE / PENDING_EXTERNAL_REVIEW

This matrix tests the review draft and current public Privacy surface requirement-by-requirement. A route existing is not evidence of completeness. Official-source verification is recorded in `GDPR_OFFICIAL_SOURCE_REGISTER_2026-09-09.md`.

## Matrix

| Requirement | GDPR | Current source/evidence | State | Gap / closure action |
|---|---|---|---|---|
| Controller identity | 13(1)(a), 14(1)(a) | Privacy review draft identifies SAMUEL CERQUEIRA, UNIPESSOAL LDA for provider-controlled processing | BLOCKED | Registered office and authoritative NIF/NIPC unresolved; entity name usable only in review draft pending registry evidence |
| Controller contact | 13(1)(a), 14(1)(a) | comercial@risckcomply.com verified as reachable intake channel | PASS | Final legal-notice mechanics remain separate |
| DPO contact, if applicable | 13(1)(b), 14(1)(b) | Article 37/CNPD screening completed; result `DPO_REQUIRED=UNCERTAIN` because scale/sensitive-data facts are incomplete | BLOCKED_APPLICABILITY_FACTS | Resolve factual triggers; do not invent DPO/contact |
| Purposes | 13(1)(c), 14(1)(c) | Privacy review draft §§2–4; RoPA; controller legal-basis matrix; public Privacy summary | PASS_DOCUMENTED | Keep synchronized with actual product/provider configuration |
| Legal bases | 13(1)(c), 14(1)(c) | `CONTROLLER_LEGAL_BASIS_MATRIX.md` maps candidate basis per provider-controlled processing purpose | PENDING_EXTERNAL_REVIEW | Validate candidate allocation and supporting necessity/obligation facts; candidate map is not final legal approval |
| Legitimate interests | 13(1)(d), 14(2)(b) | `LEGITIMATE_INTEREST_ASSESSMENTS.md` completes pre-review LIAs for security/abuse prevention, incident-response evidence and narrow B2B relationship administration; analytics/direct marketing are deliberately not approved by those LIAs | PARTIAL_PASS_PRE_REVIEW | Final Art. 6(1)(f) allocations remain external-review dependent; do not extend LIA credit to analytics or marketing |
| Recipients/categories | 13(1)(e), 14(1)(e) | Subprocessor review draft, Trust Center provider list, RoPA | BLOCKED_PROVIDER_FACTS | Reconcile exact active Production providers, roles and account contracts |
| International transfers / safeguards | 13(1)(f), 14(1)(f) | `INTERNATIONAL_TRANSFER_REGISTER.md` maps every known provider candidate and Chapter V decision states | BLOCKED_PROVIDER_EVIDENCE | Attach account-specific locations/DPA/adequacy/SCC/TIA evidence; 2021/915 Art. 28 clauses are not used as transfer SCCs |
| Retention period / criteria | 13(2)(a), 14(2)(a) | `RETENTION_SCHEDULE.md` proves the Portuguese fiscal/accounting archive period for the categories actually covered by CIVA Art. 52 / CIRC Art. 123, while keeping unrelated categories separate; exact-SHA Data Governance V2 now validates the category-specific retention schema boundary | PARTIAL_PASS | 10-year statutory accounting/VAT category and retention schema model are closed; account, support, audit/security, analytics and provider backup/log periods still require their own facts/criteria |
| Data-subject rights | 13(2)(b), 14(2)(c) | Rights matrix; authenticated export/delete controls; protected Data Governance V2 run `34448768687` on exact `main` SHA `a921445...` retained `Complete/passed` evidence with all required checks true | PASS_DOCUMENTED_EXACT_SHA_RUNTIME_GATE | #2009 technical acceptance is ready after canonical matrix reconciliation merges; downstream restriction/objection/deletion effects and case-specific legal decisions remain separate |
| Withdrawal of consent | 13(2)(c), 14(2)(d) | Source defaults optional analytics to consent-required, blocks PostHog loading/capture without a stored grant, exposes allow/decline and later withdrawal controls, stops recording and opts out on withdrawal | PASS_SOURCE_CONTROL_RUNTIME_CONFIG_OPEN | Retain exact Production analytics configuration/runtime evidence and obtain final ePrivacy/GDPR legal-basis review; other consent-based surfaces remain separate |
| Complaint to supervisory authority | 13(2)(d), 14(2)(e) | Draft states right to complain to competent supervisory authority | PASS_DOCUMENTED | Lead authority/cross-border establishment position remains subject to entity/establishment review |
| Statutory/contractual/product requirement and consequences | 13(2)(e) | `DATA_PROVISION_REQUIREMENT_MATRIX.md` maps current authentication, onboarding and Stripe Checkout fields as required, optional or conditional and records consequences of non-provision | PASS_PRE_PUBLICATION | Reconcile the approved facts into the final/public Privacy notice; do not describe product-required fields as statutory requirements unless law actually requires them |
| Automated decision-making/profiling | 13(2)(f), 14(2)(g) | Draft states provider does not intend website/account processing to make solely automated legal/significant decisions | PASS_DOCUMENTED | Revalidate if product/account decisioning changes |
| Categories of personal data for indirect collection | 14(1)(d) | Draft, RoPA and `ARTICLE14_INDIRECT_COLLECTION_REGISTER.md` identify categories/scenarios | PASS_DOCUMENTED | Keep per-flow mapping synchronized with integrations |
| Source of personal data | 14(2)(f) | Draft and Article 14 register identify organisation admins, identity/payment providers, support/security reporters, integrations and customer uploads as potential sources | PASS_DOCUMENTED | Public-source wording only if such a flow is actually activated |
| Timing / delivery of Article 14 notice | 14(3) | `ARTICLE14_INDIRECT_COLLECTION_REGISTER.md` records one-month / first-communication / first-disclosure rules; V3 invitation template implements source/purpose/privacy-link disclosure in the first teammate invitation email | PARTIAL_PASS_IMPLEMENTED | Invitation path still requires canonical merge/CI/exact-SHA evidence and complete final Privacy content; other controller-side indirect flows remain to be bound to notice evidence |
| Article 14 exceptions | 14(5) | Article 14 register defines an attributable exception decision record and explicitly approves no blanket exception | PASS_STRUCTURE_NO_EXCEPTION_ASSUMED | Only mark an exception PASS for a concrete case with facts/legal basis/safeguards |

## Public-page finding

The current public `/[locale]/privacy` route renders the Trust Center Privacy summary. That summary is materially narrower than the review draft and does not itself satisfy the full Articles 13/14 disclosure set.

Therefore:

```text
OFFICIAL_SOURCE_MAPPING=PASS
PRIVACY_REVIEW_DRAFT=SUBSTANTIALLY_MAPPED
CONTROLLER_PURPOSE_BASIS_STRUCTURE=PASS_PRE_REVIEW
LEGITIMATE_INTEREST_ASSESSMENTS=PASS_PRE_REVIEW_PARTIAL_SCOPE
ARTICLE13_2E_FACT_MAPPING=PASS_PRE_PUBLICATION
ARTICLE14_SCENARIO_TIMING_STRUCTURE=PASS
ARTICLE14_INVITATION_DISCLOSURE_PATH=PASS_IMPLEMENTED_PRE_MERGE
PORTUGUESE_FISCAL_RETENTION_PERIOD=PASS
RETENTION_SCHEMA_RUNTIME_GATE=PASS_EXACT_SHA
DATA_SUBJECT_RIGHTS_RUNTIME_GATE=PASS_EXACT_SHA
ANALYTICS_CONSENT_SOURCE_CONTROL=PASS
TRANSFER_STRUCTURE=PASS_PRE_REVIEW
RETENTION_STRUCTURE=PASS_PRE_REVIEW
PUBLIC_PRIVACY_ART13_14_COMPLETENESS=FAIL
PRIVACY_ART13_14_MAPPING=BLOCKED_FINAL_FACTS_PUBLICATION_AND_REVIEW
```

## Closure sequence

1. merge the exact-SHA rights/runtime reconciliation and close technical issue #2009;
2. reconcile the public Privacy page to the already mapped non-disputed facts, including Article 13(2)(e) distinctions, without inventing blocked facts;
3. resolve legal-entity registry facts;
4. validate final controller-side legal bases and legitimate-interest allocations;
5. close active-provider recipients/transfers with account evidence;
6. approve remaining non-fiscal retention criteria/provider rotation;
7. resolve Article 37 factual triggers;
8. merge/prove the Article 14 first-communication path and bind remaining controller-side indirect flows;
9. obtain qualified privacy review for mixed-role and material legal-basis conclusions.

No counsel signature is treated as a statutory prerequisite for every row, but material legal interpretation remains external-review work. Internal implementation, CI and exact-SHA evidence cannot substitute for qualified external judgment.