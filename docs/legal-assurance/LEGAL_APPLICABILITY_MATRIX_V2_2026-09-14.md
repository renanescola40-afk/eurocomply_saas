# RISCK COMPLY — Legal Applicability Matrix V2 (Historical Predecessor)

Date: 2026-09-14
Product: RISCK COMPLY
Owner-selected operator/seller/contracting entity: SAMUEL CERQUEIRA, UNIPESSOAL LDA
Source release: main ab8e413e68c15db43a1214098af8ae6d2a8a4a9e
Production observed: dpl_BznNuFKG8UEh4yW8y9HQyzLXDiJ9 / 13b19410caa20045b19d98d58df406c43433af5a
Status: SUPERSEDED_BY_CURRENT_LEGAL_AUTHORITY_MATRIX

Canonical current register: docs/legal-assurance/CURRENT_LEGAL_AUTHORITY.md

This historical predecessor separates statutory law, contractual requirements, GDPR/ePrivacy, company/tax facts, procurement requirements and optional assurance. It is retained for audit history and is not the current authority where its dispositions differ from CURRENT_LEGAL_AUTHORITY.md. It is not a legal opinion.

## Authority and current facts

- AI Act current legal text and amendments must be read from the Official Journal and current Commission/AI Act Service Desk material.
- Protected main is ahead of canonical Production; source and Production remain separate.
- Supabase Production is ACTIVE_HEALTHY in eu-west-1; V43 migrations are present in the live migration ledger.
- No model runtime was found in the accepted SaaS source/runtime inspection. The detailed feature inventory is in RISCK_COMPLY_REGULATORY_FEATURE_INVENTORY_V1_2026-09-14.md.
- Two BG Legal Quickscan PDFs were received. They are self-reported assessment outputs, not legal advice, and differ because the answered assumptions differ.

## AI Act applicability decision

For the accepted RISCK COMPLY release, no customer-facing or server-side model invocation, chatbot, synthetic-content generation, biometric/emotion feature or autonomous decision about natural persons was evidenced. Risk classifications, scores, checklists and document/evidence workflows are deterministic compliance/governance logic.

Working classification: NO_AI_SYSTEM_IDENTIFIED_FOR_CURRENT_ACCEPTED_RISCK_RUNTIME.

This is a bounded self-assessment, not a binding regulator or court determination. It is used for current-release applicability only, with change triggers in the feature inventory.

| Workstream | Current classification | Current closure | Human legally required now? | Reopen trigger |
|---|---|---|---|---|
| LEGAL_RULES | NOT_APPLICABLE_CURRENT_RELEASE | Feature inventory + official AI Act sources | No | AI-system feature/model added |
| ARTICLE_5 | NOT_APPLICABLE_CURRENT_RELEASE | N/A; product questionnaire is governance control | No | RISCK implements a prohibited practice |
| ARTICLE_50 | NOT_APPLICABLE_CURRENT_RELEASE | No direct AI interaction/synthetic output evidenced | No | Chatbot, assistant or synthetic content |
| FRIA | NOT_APPLICABLE_CURRENT_RELEASE | RISCK is not deployer of customer's AI merely by storing records | No | RISCK becomes deployer of qualifying high-risk AI |
| DEPLOYER | NOT_APPLICABLE_CURRENT_RELEASE | No qualifying RISCK deployment evidenced | No | Qualifying AI deployment |
| HIGH_RISK_PROVIDER | NOT_APPLICABLE_CURRENT_RELEASE | No qualifying RISCK AI system placed on market | No | Qualifying AI system placed on market |
| CONFORMITY | NOT_APPLICABLE_CURRENT_RELEASE | Article 43 route not triggered | No | Article 43 route becomes applicable |
| GPAI | NOT_APPLICABLE_CURRENT_RELEASE | No GPAI provider role or integrated model evidenced | No | Training/providing/integrating model feature |

LEGAL_REQUIREMENTS_8_OF_8_OR_NA=8/8 for this bounded release. LEGAL_8_OF_8_HUMAN_REVIEWS=0/8 is truthful and not a statutory launch failure.

## GDPR and ePrivacy matrix

| Requirement | Applies? | Current evidence | State |
|---|---|---|---|
| GDPR principles, lawfulness and transparency | Yes | Technical privacy structure; legal-basis mapping remains candidate/pre-review | OPEN |
| Articles 13/14 identity and processing information | Yes for controller-side processing | Public page says final entity identifiers are pending | OPEN statutory/publication blocker |
| Articles 15–22 rights and automated-decision boundary | Yes where personal data is processed | DSR runtime structures exist; case decisions remain fact-dependent | PARTIAL |
| Article 25 privacy by design/default | Yes | Auth, tenant scope, RLS, step-up, no-store and consent-gated analytics | PARTIAL/PASS TECHNICAL |
| Article 28 processor contract | Yes when processing customer data as processor | DPA is a review draft, not executed | OPEN for customer activation |
| Article 30 records | Fact/role dependent | ROPA and data matrices prepared, not frozen | OPEN |
| Article 32 security | Yes | Strong technical evidence; provider/contract evidence incomplete | PARTIAL |
| Articles 33/34 breach handling | Event dependent | Incident response and without-undue-delay position exist | PARTIAL |
| Article 35 DPIA | Fact dependent | No universal RISCK DPIA trigger established | FUTURE/FACT-DEPENDENT |
| Article 37 DPO | Fact dependent | No final applicability decision or appointment | OPEN FACT DECISION |
| Articles 44–49 transfers | Yes if third-country access/transfer occurs | Provider/account/transfer facts incomplete | OPEN |
| Direct marketing/ePrivacy | Purpose dependent | Consent/suppression mapping exists; send-time evidence incomplete | OPEN |
| Browser storage/analytics | Yes if optional storage/analytics used | Consent-gated design; exact production/provider retention not fully verified | PARTIAL/OPEN |

## Provider legal matrix

| Provider/service | Current factual signal | Legal closure |
|---|---|---|
| Vercel | Connected Pro project; production observed in iad1 | DPA/regions/transfers/retention OPEN |
| Supabase | Production active in eu-west-1; DPA framework correspondence | Account-specific transfer/subprocessor/retention OPEN |
| Stripe | Live account RISCK COMPLY SAAS exposed; detail call failed | Entity/tax/role/transfer/retention OPEN |
| Google OAuth/Identity | Used through Supabase Auth | Account role/locations/retention/transfers OPEN |
| Google Workspace | Corporate mail operational | CDPA/locations/retention/transfers OPEN |
| GitHub Actions | Protected workflows active; possible transient CI handling | DPA/runner transfer/role OPEN |
| Sentry | Integration present; current account evidence incomplete | Region/retention/DPA/transfers OPEN |
| PostHog | Connected project not attributable to Production | Production project/retention/DPA/transfers OPEN |
| Upstash | Redis rate-limit integration present | Account/region/retention/DPA/transfers OPEN |
| Resend/email | Historical delivery evidence only | Account/region/retention/DPA/transfers OPEN |
| Malware scanner | Conditional/unverified | Do not treat as active subprocessor |

## Company, commercial and fiscal matrix

| Area | Current state | Required closure |
|---|---|---|
| Seller/operator/contracting entity | Owner designated SAMUEL CERQUEIRA, UNIPESSOAL LDA | Current registry extract, identifier, address and signatory evidence |
| Brand/domain/contact | RISCK COMPLY, risckcomply.com, comercial@risckcomply.com | Usable contact; correspondence address is not registered office |
| NIF/NIPC/VAT | Not authoritatively verified | AT/VIES/accountant evidence; reconcile Stripe |
| CAE/software activity | Owner-deferred | Owner-authorised administrative action if required |
| Terms | Public review draft, not effective | Final facts, commercial decisions and binding order process |
| DPA | Public review draft, not signed | Article 28 schedule, provider/subprocessor/transfer facts |
| Privacy | Review draft with missing identity facts | Controller identity, bases, recipients, retention and publication |
| Cookies | Review draft; consent design exists | Production storage inventory, consent/withdrawal test and provider facts |
| Procurement | Internal packet advanced | Bind to accepted release; buyer-specific items are WAITING_BUYER |

## Scorecard

Evidence-weighted management scores, not legal opinions:

| Domain | Score |
|---|---:|
| AI_ACT_APPLICABLE_LEGAL | 100% |
| GDPR_PRIVACY | 55% |
| EPRIVACY_COOKIE | 50% |
| COMMERCIAL_LEGAL | 45% |
| ENTITY_LEGAL | 25% |
| PROVIDER_LEGAL | 30% |
| PROCUREMENT_LEGAL | 60% |

Using AI 20%, GDPR 25%, ePrivacy 10%, commercial 15%, entity 10%, provider 10% and fiscal/legal facts 10% at 20% closure: LEGAL_LAUNCH_PERCENT=53%.

Strict maximum-assurance score remains 38% because optional qualified reviews, exact-current-main Production proof, clean external retest, fiscal evidence and buyer assurance gates remain open.

## Terminal status

LEGAL_LAUNCH_100=NO_PASS
LEGAL_MAX_ASSURANCE_100=NO_PASS
LEGAL_PUBLICATION=BLOCKED_FOR_FINAL_PUBLICATION
MANDATORY_HUMAN_REQUIREMENTS_COUNT=0_IDENTIFIED_FOR_CURRENT_RELEASE
OPTIONAL_HUMAN_ASSURANCE_COUNT=9
LEGAL_8_OF_8_HUMAN_REVIEWS=0/8
MASTER_LEGAL_OPINION=OPTIONAL_ENTERPRISE_ASSURANCE_OPEN

No mandatory notified-body, regulator filing, DPO appointment or qualified human sign-off was identified solely from the current deterministic RISCK release. Fact-dependent GDPR/company/tax duties and customer-specific requirements remain binding.
