# RISCK COMPLY — Current Legal Authority Matrix

**Effective evidence date:** 14 September 2026  
**Product:** RISCK COMPLY  
**Repository release reference:** `main@c7bb972e45b84fbe665e233c1a5550f72080bf2e`  
**Status:** canonical current legal-control register; not legal advice, certification, regulator approval or executed contract

## Authority and scope

This register supersedes contradictory historical tracker statuses for current-state control decisions. Historical files and issues remain retained for audit history, but they must be read through this register.

Authority order:

1. applicable EU and Portuguese law;
2. official Commission, AI Office, EDPB, CNPD and other competent-authority guidance;
3. accepted product functionality and attributable runtime evidence;
4. protected `main` and the current Production release;
5. provider/account evidence;
6. attributable issue evidence;
7. historical trackers and chat assumptions.

The entity lane is intentionally deferred and is not silently treated as closed.

## Current product boundary

The currently accepted RISCK COMPLY release is treated as deterministic compliance/governance software for this matrix. No attributable evidence currently establishes a model invocation in the accepted RISCK COMPLY runtime.

The product may store customer-entered AI inventories, risk classifications, documents, scores and recommendations. Customer subject matter does not by itself classify RISCK COMPLY as a high-risk AI system.

A future model call, generative feature, biometric/person-related function, employment/credit/essential-service decision function, or customer-specific deployment that changes this boundary reopens the relevant control set before release or use.

## Historical eight-workstream migration

| Historical workstream | Current disposition | Current rationale | Reopen trigger |
|---|---|---|---|
| LEGAL_RULES | APPLICABLE_STATUTORY_REQUIREMENT — closed by current matrix | Applicable law is mapped here; no automatic human signature is required merely because the historical tracker requested one. | Material legal ambiguity or changed product/legal scope |
| ARTICLE_5 | NOT_APPLICABLE_CURRENT_RELEASE | No RISCK COMPLY feature is identified as an Article 5 prohibited practice. Acceptable Use controls prohibit unlawful/prohibited use claims and activity. | A product feature or deployment practice enters Article 5 scope |
| ARTICLE_50 | NOT_APPLICABLE_CURRENT_RELEASE | No AI-system runtime or synthetic-content generation is evidenced for the accepted release. Deterministic templates and governance outputs are not treated as Article 50 AI-generated content without contrary facts. | Model invocation or AI-generated/synthetic content in the product |
| FRIA | NOT_APPLICABLE_CURRENT_RELEASE | RISCK COMPLY is not itself evidenced as a deployer of a high-risk AI system in a use case requiring an FRIA. | RISCK COMPLY deploys or operates an in-scope high-risk use case |
| DEPLOYER | FUTURE_TRIGGER_ONLY | Customer use of RISCK COMPLY to govern another AI system does not make RISCK COMPLY the deployer of that other system. | RISCK COMPLY itself operates an in-scope system or assumes deployer duties |
| HIGH_RISK_PROVIDER | NOT_APPLICABLE_CURRENT_RELEASE | No current RISCK COMPLY feature is classified as a high-risk AI system provider feature. | A feature satisfies an Annex III or other high-risk route |
| CONFORMITY | FUTURE_TRIGGER_ONLY | No current high-risk AI system or mandatory conformity route is evidenced for RISCK COMPLY. | A high-risk system or other mandatory conformity route becomes applicable |
| GPAI | NOT_APPLICABLE_CURRENT_RELEASE | No GPAI model provider or GPAI model runtime role is evidenced for RISCK COMPLY. | RISCK COMPLY develops, places on the market or materially integrates an in-scope GPAI role |

A valid N/A or future-trigger determination is full closure for the current-release applicability decision. It is not a claim that the obligation can never apply.

## Current applicable controls

| Control family | State | Evidence boundary | Terminal blocker |
|---|---|---|---|
| AI Act current-release classification | CLOSED FOR CURRENT BOUNDARY | Product inventory, deterministic-runtime evidence and Article 5/50 regression coverage | Reopen on model/runtime or use-case change |
| GDPR role allocation | OPEN — factual/contractual closure | Privacy/DPA drafts, data-role matrix and product tenant model | Final role, scope and instructions must be reconciled |
| Article 28 DPA | OPEN | Public DPA review draft and provider framework evidence | Binding customer DPA and factual provider overlay |
| Subprocessors | OPEN | Trust Center register and provider disclosures | Account-attributed providers, regions, subprocessors and notice mechanics |
| International transfers | OPEN | Transfers review surface and Chapter V analysis boundary | Provider-specific transfer mechanism and account evidence |
| Retention/deletion | OPEN | Retention policy and implementation status | Runtime enforcement and provider lifecycle evidence |
| Cookies/ePrivacy | OPEN — runtime verification | Cookie Policy and consent controls | Production configuration and analytics attribution |
| Security/breach/DSR alignment | OPEN — evidence reconciliation | Code controls, policies and operational evidence | Current runtime evidence and incident/DSR procedures |
| Terms/commercial publication | OPEN — review draft | Terms, Acceptable Use and billing boundary | Factual, contractual and final publication closure |
| Entity disclosure | DEFERRED BY OWNER | No entity facts are decided in this register | Dedicated entity evidence lane |
| Tax/VAT-specific position | DEFERRED BY OWNER | General legal logic only; no company-specific tax conclusion | Authoritative tax/account evidence |
| Buyer-specific procurement | WAITING_BUYER | Procurement pack separates statutory, privacy, security and optional assurance | Customer questionnaire or contract requirement |

## Assurance separation

The following are not automatic launch requirements for the current deterministic release:

- eight qualified human legal reviews;
- a Master Legal Opinion;
- a notified body;
- a regulator approval;
- a certification;
- a pentest, unless required by a particular customer, contract, insurer or selected assurance policy.

If applicable law, a contract or a buyer specifically requires one, it becomes a separate external gate and must not be marked closed without attributable evidence.

## Current working scores

These are internal matrix percentages, not statutory findings:

- AI Act applicable legal: 100%
- GDPR/privacy: 55%
- Commercial legal: 45%
- Entity legal: 25% — intentionally deferred
- Provider legal: included in the open GDPR/provider controls
- Procurement legal: 60%
- Legal launch: 53%
- Legal maximum assurance: 38%

No percentage authorises publication of a page that still states `REVIEW_DRAFT · FACTUAL_CLOSURE_REQUIRED`.

## Official anchors

- [Regulation (EU) 2024/1689 — AI Act](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [Regulation (EU) 2016/679 — GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [European Commission — AI transparency obligations](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations)
- [EDPB — GDPR territorial scope](https://www.edpb.europa.eu/documents/guideline/guidelines-32018-on-the-territorial-scope-of-the-gdpr-article-3-version-adopted_en)

## Change control

Before changing a disposition, record:

- the changed product feature or legal source;
- the exact effective date;
- the evidence reference;
- whether the change is statutory, contractual, GDPR, AI Act, commercial, buyer-specific or optional assurance;
- the owner/external action required, if any.

