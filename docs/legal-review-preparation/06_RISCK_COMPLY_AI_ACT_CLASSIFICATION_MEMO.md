# Risck Comply AI Act Classification Memorandum

## Status and limitation

- Status: `AI_PRE_REVIEW_ONLY`
- Legal review: `HUMAN_REVIEW_REQUIRED`
- Source baseline: Regulation (EU) 2024/1689 as amended by Regulation (EU) 2026/1744
- Product SHA baseline: `fbc61f3a5f069c23f9bc307789d12a53b5f87d34`

This memorandum is a structured engineering and legal-operations pre-review. It is not a legal opinion.

## Product characterisation

Risck Comply is primarily a B2B compliance-operations platform. Most modules appear to be deterministic software for records, workflows, rules, scoring, evidence completeness, document assembly, task creation and auditability.

Whether any specific module is itself an “AI system” depends on its actual technical implementation and the current statutory definition, including whether the module operates with machine-based inference and generates outputs such as predictions, content, recommendations or decisions that influence environments.

## Module separation

| Module type | Preliminary characterisation | Required evidence |
|---|---|---|
| CRUD/workflow/RBAC/audit | Conventional deterministic software | source and runtime confirmation |
| Versioned legal rules | Deterministic rule representation | source currency and counsel review |
| Readiness/risk scoring | Potential deterministic scoring; classification depends on logic | algorithm and input/output review |
| Document templates/assembly | Conventional generation unless model inference is used | provider/model call inventory |
| Generative drafting or assistance | Potential AI-system functionality | model, provider, intended purpose, data use and output controls |
| Recommendations/classification suggestions | Potential AI-system functionality depending on inference | technical architecture and influence analysis |
| Customer AI inventory | Customer record, not automatically a Risck Comply AI system | product-boundary confirmation |

## Preliminary operator roles

For conventional software modules, the AI Act operator roles may not apply to Risck Comply as an AI-system provider. Where Risck Comply integrates or exposes an AI model or AI-enabled feature, its role may include deployer, provider, downstream provider, integrator or distributor depending on branding, intended purpose, contractual allocation and the degree of modification/control.

Risck Comply must not assume that calling a third-party model always makes it only a deployer. Rebranding, integration, fine-tuning, substantial modification or intended-purpose changes may create provider obligations.

## High-risk analysis

The platform's intended purpose is compliance operations and evidence preparation. It is not intended to make final decisions in Annex III sensitive areas such as employment, education, essential services, law enforcement, migration or biometric identification.

A customer may use Risck Comply to document systems used in high-risk contexts. That does not by itself make the Risck Comply platform high-risk. However, a module that directly evaluates, ranks, recommends or determines outcomes about natural persons in a listed context could materially change the analysis and must be blocked pending review.

Preliminary position: no current basis has been established to classify the whole platform as a high-risk AI system. This position is conditional and requires technical confirmation of every AI-enabled module and qualified counsel acceptance.

## Prohibited-practice analysis

The product must not enable or market functions for manipulation, exploitation of vulnerabilities, social scoring, prohibited predictive policing, prohibited facial-image scraping, prohibited biometric categorisation, prohibited emotion recognition or unlawful remote biometric identification. It should identify customer risk signals and fail closed where facts are incomplete.

The 2026 Article 5 amendments must remain date-bound and subject to precise statutory conditions. The platform must not simplify exceptions into unconditional approvals.

## Article 50 analysis

If Risck Comply exposes interactive AI or generates synthetic text/content through an AI system, provider/deployer transparency obligations may apply. Notices must be role-specific, timely, accessible and linked to the actual user experience. The Article 50(2) transition for qualifying pre-existing systems must not be applied to unrelated deployer obligations.

## GPAI analysis

Using a GPAI model does not normally make the customer or Risck Comply the original GPAI provider. Duties depend on whether Risck Comply develops, places on the market, substantially modifies, rebrands or integrates a model as a downstream provider. The model-provider inventory and contracts are required before a final position.

## Preliminary conclusion

1. The product is predominantly conventional compliance-operations software.
2. Individual AI-enabled modules may qualify as AI systems and require module-level assessment.
3. No final high-risk classification is established for the platform as a whole.
4. Risck Comply must preserve a non-decision-support intended purpose and avoid sensitive final decisions.
5. Provider/downstream-provider exposure cannot be closed until model integrations, branding, modification and contracts are verified.
6. Article 5, Article 50 and GPAI boundaries require qualified review.
7. Final status remains `HUMAN_REVIEW_REQUIRED`.

## Closed questions for counsel

- Do you agree with the product characterisation above?
- Do you agree that the intended purpose is evidence and decision support, not final decision-making?
- Which current modules constitute AI systems?
- Does any current module create high-risk exposure?
- Could integration, rebranding, fine-tuning or substantial modification make Risck Comply a provider or downstream provider?
- Which mandatory disclosures and disclaimers apply?
- Which features must be blocked, restricted or escalated?
- Does Regulation (EU) 2026/1744 change any proposed position?
- Do Portuguese national rules add obligations or professional boundaries?
