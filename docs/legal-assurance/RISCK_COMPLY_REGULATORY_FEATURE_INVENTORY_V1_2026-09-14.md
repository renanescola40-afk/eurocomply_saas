# RISCK COMPLY — Regulatory Feature Inventory V1

Date: 2026-09-14
Release source reviewed: main ab8e413e68c15db43a1214098af8ae6d2a8a4a9e
Production source observed: 13b19410caa20045b19d98d58df406c43433af5a
Status: EVIDENCE_BOUND_SELF_ASSESSMENT

This inventory is a release-bound factual classification aid. It is not legal advice, a conformity assessment, a regulator decision or a certification.

## Current product boundary

The repository and connected runtime inspection found no Production import or invocation of an OpenAI SDK, Vercel AI SDK generation primitive, Anthropic SDK or Gemini SDK. OPENAI_API_KEY references are confined to protected repository automation and secret guarding. The customer-facing product provides compliance/governance workflows, fixed rules, data capture, scoring and document/evidence workflows.

The current accepted release is therefore assessed as deterministic compliance/governance software with no model-driven generation or conversational AI runtime. Customer AI systems recorded in the inventory are subject matter managed by the product; they do not automatically change the regulatory classification of RISCK COMPLY itself.

## Feature inventory

| Feature | Behaviour | Model/runtime | Output | Customer-visible | Personal data | Current AI Act position |
|---|---|---|---|---|---|---|
| Public marketing and trust pages | Static/localised content and safe disclosure language | No model found | Text, links, illustrative content | Yes | Contact/analytics data may occur | No AI system identified |
| AI-system inventory | Stores customer-entered systems, vendors, countries, owners and lifecycle facts | Deterministic CRUD | Records and views | Yes | Customer-provided data may contain personal data | No AI system identified |
| Risk classification and score | Applies configured rules, categories, scores and checklists to submitted facts | Deterministic rules | Classification, score, recommendation/checklist | Yes | Customer-provided data may contain personal data | No model-driven inference identified; customer use must be assessed separately |
| EU AI Act legal-rules engine | Versioned rule catalogue and applicability metadata | Deterministic rules | Rule results and evidence references | Yes | May contain workspace data | No AI system identified |
| Article 5 prohibited-practice workflow | Captures signals, exceptions, evidence and decisions | Deterministic workflow | Review status and evidence | Yes | May contain personal data | Product governance control; not itself an Article 5 practice |
| FRIA workflow | Collects fundamental-rights assessment inputs, decisions and evidence | Deterministic workflow | Assessment records | Yes | May contain personal data | Not a RISCK high-risk AI system |
| Documents/evidence vault | Stores templates, uploads, generated records and audit evidence | Template/database operations; no model found | Documents and exports | Yes | May contain personal data | No model-driven generation identified |
| Regulatory monitoring/update records | Stores updates, preferences and operational tasks | Deterministic records/workflows | Alerts/tasks/status | Yes | Account/workspace metadata | No AI system identified |
| Authentication/RBAC/tenant isolation | Identity, roles, RLS and authorization | No model | Access decisions | Yes | Identity/session data | Outside AI Act AI-system classification |
| Billing and add-ons | Stripe-backed subscription/entitlement logic | Deterministic provider integration | Billing/entitlement state | Yes | Billing/contact data | Outside AI Act AI-system classification |
| Optional product analytics | Consent-gated PostHog integration | No model | Telemetry events | Not a decision feature | Usage/device metadata | Outside AI Act AI-system classification |
| Internal repository automation | Protected CI/Codex workflow may use an external AI tool operationally | Not part of customer SaaS runtime | Code/review automation | No customer feature | Repository/CI data | Assess under the tool/account context, not as a RISCK customer feature |

## Resolved feature-level fields

- DETERMINISTIC_OR_MODEL_DRIVEN: deterministic for the accepted release.
- AI_MODEL_USED: no model invocation evidenced in the accepted SaaS runtime.
- GENERATES_OUTPUT: yes, in the ordinary software sense of views, scores, checklists, templates and records; no synthetic generative-media/text model output evidenced.
- MAKES_RECOMMENDATION: rule-based recommendations/checklists exist; they are operational aids and not autonomous decisions about natural persons.
- MAKES_CLASSIFICATION: rule-based classification of customer-entered AI systems/risk categories exists; no model inference evidenced.
- AUTONOMY_LEVEL: user/request-driven workflows with deterministic server-side logic.
- HUMAN_REVIEW: customer review is required before material legal, regulatory, employment, fundamental-rights or other high-impact reliance.
- SPECIAL_CATEGORY_DATA_EXPECTED: not a default supported use; customer Terms/DPA boundary excludes intentional ordinary use without approved scope and safeguards.
- AI_ACT_AI_SYSTEM: no AI system identified for the accepted RISCK COMPLY runtime on the evidence reviewed.
- GPAI: no third-party GPAI model integrated into the customer SaaS runtime was evidenced.
- ARTICLE_50: no current chatbot, direct AI interaction, synthetic content, deepfake, biometric categorisation or emotion-recognition feature was evidenced.
- HIGH_RISK / FRIA / CONFORMITY: not applicable to RISCK COMPLY's own current deterministic release. A customer may still need those obligations for an AI system recorded in the workspace.

## Change triggers

Reopen this inventory before release or feature publication if any of the following occurs:

1. a model/API is called by customer-facing or server-side product code;
2. a chatbot, assistant or natural-person direct AI interaction is added;
3. synthetic text, image, audio or video is generated or manipulated;
4. biometric categorisation, emotion recognition, employment, essential-service, law-enforcement, migration, education or justice-related functionality is added;
5. product outputs become decisions about natural persons rather than governance aids;
6. the product starts training, placing or providing a GPAI model on the market;
7. an external assessment or competent authority provides attributable contradictory facts.

## Sources

- Regulation (EU) 2024/1689 — https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- Digital Omnibus on AI — Regulation (EU) 2026/1744 — https://eur-lex.europa.eu/eli/reg/2026/1744/oj
- Commission AI-system definition guidance — https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-ai-system-definition-facilitate-first-ai-acts-rules-application
- Commission prohibited-practices guidance — https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-prohibited-artificial-intelligence-ai-practices-defined-ai-act
- AI Act Article 50 Service Desk text — https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50
