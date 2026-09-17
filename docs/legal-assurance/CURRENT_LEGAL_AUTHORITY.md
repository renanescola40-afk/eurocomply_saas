# RISCK COMPLY — Current Legal Authority Matrix

**Effective evidence date:** 17 September 2026  
**Product:** RISCK COMPLY  
**Repository evidence baseline:** protected `main@67efbee2c22a17a42e87dba603324e645fe45b87`, the protected merge of Prompt 4 V4 PR #2104, plus current connected-account/runtime observations. Later release-line changes must be rebound separately and do not retroactively change this evidence baseline.  
**Status:** canonical current legal-control register; not legal advice, certification, regulator approval or executed contract

## Authority and scope

This register supersedes contradictory historical tracker statuses for current-state control decisions. Historical files and issues remain retained for audit history, but they must be read through this register.

Authority order:

1. applicable EU and Portuguese law;
2. official Commission, AI Office, EDPB, CNPD and other competent-authority guidance;
3. accepted product functionality and attributable runtime evidence;
4. protected `main` and the current Production release;
5. provider/account evidence;
6. attributable issue/evidence records;
7. historical trackers and chat assumptions.

No control is closed merely because a historical workflow requested a human signature. A documented `NOT_APPLICABLE` determination closes the current scope only when it contains attributable facts, rationale and a change trigger.

## Current product boundary

The currently evidenced RISCK COMPLY customer-facing runtime is treated as deterministic compliance/governance software. No attributable evidence currently establishes a direct model invocation in the SaaS runtime.

The product may store customer-entered AI inventories, risk classifications, documents, scores and rule-based recommendations. Customer subject matter does not by itself classify RISCK COMPLY as an AI-system provider/deployer or high-risk AI system.

A future model call, generative feature, biometric/person-related function, employment/credit/essential-service decision function, or customer-specific deployment that changes this boundary reopens the relevant control set before release or use.

## Historical eight-workstream migration

| Historical workstream | Current disposition | Current rationale | Reopen trigger |
|---|---|---|---|
| LEGAL_RULES | APPLICABLE_STATUTORY_REQUIREMENT — mapped into current mandatory controls | Applicable law remains mandatory; no automatic external-lawyer signature is created merely because the historical tracker requested one. | Material legal ambiguity, new binding requirement or changed product/legal scope |
| ARTICLE_5 | NOT_APPLICABLE_CURRENT_RELEASE | No RISCK COMPLY feature is identified as an Article 5 prohibited practice. | Product/deployment enters Article 5 scope |
| ARTICLE_50 | NOT_APPLICABLE_CURRENT_RELEASE | No AI-system runtime or synthetic-content generation is evidenced for the current release. | Model invocation or AI-generated/synthetic content enters product runtime |
| FRIA | NOT_APPLICABLE_CURRENT_RELEASE | RISCK COMPLY is not itself evidenced as deployer of a high-risk AI system in a use case requiring FRIA. | RISCK COMPLY itself deploys/operates an in-scope high-risk use case |
| DEPLOYER | FUTURE_TRIGGER_ONLY | Customer use of RISCK COMPLY to govern another AI system does not make RISCK COMPLY deployer of that other system. | RISCK COMPLY itself operates an in-scope system or assumes deployer duties |
| HIGH_RISK_PROVIDER | NOT_APPLICABLE_CURRENT_RELEASE | No current RISCK COMPLY feature is classified as a high-risk AI system provider feature. | Feature satisfies a high-risk route |
| CONFORMITY | FUTURE_TRIGGER_ONLY | No current high-risk RISCK AI system or mandatory conformity route is evidenced. | High-risk system/conformity route becomes applicable |
| GPAI | NOT_APPLICABLE_CURRENT_RELEASE | No GPAI model provider or customer-facing GPAI runtime role is evidenced. | RISCK COMPLY develops, places or materially integrates an in-scope GPAI role |

A valid N/A or future-trigger determination is full closure for the current-release applicability decision. It is not a claim that the obligation can never apply.

## Current applicable controls

| Control family | State | Evidence boundary | Terminal blocker / change trigger |
|---|---|---|---|
| AI Act current-release classification | CLOSED_CURRENT_SCOPE | Regulatory feature inventory + deterministic runtime/provider scan | Reopen on model/runtime or use-case change |
| GDPR controller/processor role allocation | OPEN_FACTUAL_CONTRACTUAL | Privacy/DPA/data-role matrix + tenant model | Final public party identity, customer instructions and effective contract set |
| Article 13/14 notice + lawful bases | OPEN_FINAL_PUBLICATION | Privacy matrix + legal-basis matrix | Entity identity, final recipient/provider/transfer facts, effective notice publication |
| Article 28 DPA | OPEN_FINAL_FACTS_AND_BINDING_EFFECT | DPA control matrix + public DPA review surface | Entity facts, final subprocessor/transfer/retention annexes and binding acceptance/incorporation path |
| Subprocessors | OPEN_ACCOUNT_FACTS | Provider factual register + current runtime/provider evidence | Actual active legal entities/services, purposes, regions/access and notice treatment |
| International transfers | OPEN_ACCOUNT_AND_MECHANISM_FACTS | Transfer register + provider materials | Flow-by-flow transfer/access facts and attributable Chapter V mechanism where required |
| Retention/deletion | OPEN_PARTIAL | Retention schedule + DSR/delete runtime | Final category criteria and provider backup/log lifecycle evidence |
| DSR + breach process | STRONG_PARTIAL / RUNTIME_EVIDENCE_OPEN | DSR lifecycle controls + breach procedure | Current exact-release/runtime evidence and downstream provider obligations |
| DPO applicability | CLOSED_CURRENT_SCOPE | `DPO_REQUIREMENT_ASSESSMENT.md` + 2026-09-17 Production aggregate scale snapshot | Reopen on Article 37 trigger/change |
| DPIA applicability | CLOSED_CURRENT_SCOPE | `DPIA_SCREENING.md` + current deterministic/product-purpose evidence | Reopen on Article 35 high-risk trigger/change |
| Cookies/ePrivacy/analytics | OPEN_RUNTIME_AND_PROVIDER_FACTS | Consent-gated source controls + Cookie Policy | Exact Production configuration/storage/project/retention verification or keep non-essential path disabled |
| Commercial communications | NOT_ACTIVE_AS_AUTOMATED_MARKETING_ON_CURRENT_EVIDENCE / REOPEN_IF_ENABLED | No current evidence of an enabled automated marketing/newsletter runtime | Reopen before activating non-essential direct-marketing automation |
| Terms/commercial publication | OPEN_FINAL_FACTS_AND_EFFECT | Terms/AUP + owner legal package | Entity/Prompt-3 fiscal facts, final incorporation mechanism and deliberate effective publication |
| Entity disclosure | MANDATORY_OPEN | Owner designates `SAMUEL CERQUEIRA, UNIPESSOAL LDA`; authoritative current registry evidence not present | Current official registered name, registered office, public register/number and required company-site particulars before final publication |
| Tax/VAT-specific position | ROUTED_PROMPT_3 / OPEN | No company-specific conclusion inferred here | Prompt 3 authoritative VAT/tax/account reconciliation |
| Buyer-specific procurement | WAITING_REAL_BUYER | Internal procurement packet/data room prepared | Actual buyer questionnaire/contract only when a buyer exists |

## DPO and DPIA current-scope result

Read-only Production aggregates observed on 2026-09-17:

```text
AUTH_USERS=207
ORGANIZATIONS=257
ORGANIZATION_MEMBERS=196
DATA_SUBJECT_REQUESTS=0
AI_INCIDENTS=0
```

The counts are not treated as universal legal thresholds. They are combined with the product purpose, absence of person-level model inference/significant automated decisions, and the service boundary excluding large-scale special-category/criminal-data processing as an ordinary purpose. The current result is therefore:

```text
DPO_REQUIRED=NO_CURRENT_MANDATORY_TRIGGER_IDENTIFIED
DPIA_REQUIRED=NO_CURRENT_MANDATORY_TRIGGER_IDENTIFIED
```

Both must be re-screened on material scope change.

## Entity disclosure is not optional for final commercial publication

The owner-designated contracting/selling entity remains `SAMUEL CERQUEIRA, UNIPESSOAL LDA`, but the current authoritative registry record has not been produced in this lane. Public third-party directories currently conflict with owner-supplied historical facts regarding registered address/age/activity, so they are not sufficient authority for final publication.

The final commercial website/legal set must use attributable current entity facts. Do not publish a correspondence address as the registered office without official evidence.

## Assurance separation

The following are **not automatic launch requirements** for the current deterministic release:

- eight qualified human legal reviews;
- a Master Legal Opinion;
- a notified body;
- regulator approval;
- certification;
- buyer acceptance;
- a legal opinion merely because an internal historical workflow requested one.

If applicable law, a regulator/conformity route, a signed contract or an actual buyer specifically requires qualified external review for the relevant scope, that requirement becomes mandatory and cannot be self-closed. Merged PR #2104 introduced the separate mandatory launch-readiness artifact so the absence of optional counsel cannot close or open unrelated statutory controls.

## Legal launch truth boundary

```text
LEGAL_LAUNCH_100=NO_PASS
LEGAL_MAX_ASSURANCE_100=NO_PASS_OPTIONAL_ASSURANCE_OPEN
PROCUREMENT_INTERNAL_READY=PASS
BUYER_EXTERNAL_ACCEPTANCE=WAITING_REAL_BUYER
FINAL_PUBLIC_LEGAL_SURFACES=REVIEW_DRAFT / NOT_YET_EFFECTIVE
```

Final Legal launch must not become `PASS` until all mandatory control groups are `PASS` or valid `NOT_APPLICABLE`, the attributable Founder/Entity facts are accepted, the public legal surfaces are deliberately made effective, and any actually triggered qualified-external-review requirement is satisfied.

## Current working scores

These are internal closure-management indicators, not percentages of law satisfied:

- AI Act current-scope applicability: 100%
- DPO/DPIA applicability screening: 100% for current evidenced scope
- GDPR/privacy overall: materially implemented but not final because entity/provider/transfer/retention/publication facts remain open
- Procurement internal preparation: PASS
- Legal launch: remains NO_PASS regardless of document count while mandatory factual/publication blockers remain
- Legal maximum assurance: optional external reviews remain open

## Official anchors

- [Regulation (EU) 2024/1689 — AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [Regulation (EU) 2016/679 — GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [CNPD — Avaliação de impacto sobre a proteção de dados](https://www.cnpd.pt/organizacoes/outras-obrigacoes/avaliacao-de-impacto/)
- [Decreto-Lei n.º 7/2004 — comércio eletrónico / informação permanente do prestador](https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2004-73199154)
- [European Commission — AI transparency obligations](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations)
- [EDPB — GDPR territorial scope](https://www.edpb.europa.eu/documents/guideline/guidelines-32018-on-the-territorial-scope-of-the-gdpr-article-3-version-adopted_en)

## Change control

Before changing a disposition, record:

- the changed product feature or legal source;
- the exact effective date;
- the evidence reference;
- whether the change is statutory, contractual, GDPR, AI Act, commercial, buyer-specific or optional assurance;
- the owner/external action required, if any.

Do not convert missing external facts into internal implementation defects, and do not convert historical counsel-preparation work into a universal launch requirement.