# RISCK COMPLY — BG Legal EU AI Act Quickscan Reconciliation

Date: `2026-09-14`  
Evidence date: `2026-09-12`  
Classification: `EXTERNAL_ASSESSMENT_EVIDENCE_RECEIVED / SELF_REPORTED_CLASSIFICATION_CONFLICT / NOT_LEGAL_OPINION`

## Purpose

Record a public-safe reconciliation of the external BG Legal EU AI Act Quickscan evidence received for RISCK COMPLY without relabelling a self-report questionnaire as qualified legal advice or selecting the most favorable result when the evidence conflicts.

The report bodies remain controlled external artifacts and are not reproduced in this public repository.

## Evidence received

Two BG Legal EU AI Act Quickscan reports were received on `2026-09-12` for the owner-designated RISCK COMPLY operator context.

Both reports contain the provider's own disclaimer that the Quickscan is an initial indication based on self-reporting and **does not constitute legal advice**.

### Earlier report

The earlier report classified the answered scenario broadly as:

- AI system: `YES` under the Quickscan logic;
- territorial AI Act scope: applicable;
- no prohibited Article 5 practice identified;
- role: provider under the Quickscan answers;
- third-party GPAI answer path: `YES`;
- risk: `LIMITED RISK / ARTICLE 50 TRANSPARENCY`;
- action items included chatbot/human-interaction transparency and AI-generated-content transparency.

The same questionnaire record also stated that no specific external GPAI model was demonstrably integrated into the RISCK COMPLY Production runtime at that time and that OpenAI/ChatGPT use was operationally outside the SaaS runtime. That creates an internal questionnaire tension that must not be hidden.

### Later report

A later Quickscan report received minutes afterwards classified the answered scenario broadly as:

- AI system: `PROBABLY NO` under the Quickscan logic;
- territorial scope: applicable;
- no prohibited Article 5 practice identified;
- risk: `MINIMAL RISK`;
- rationale: the answered system was described as fixed human-programmed rules without learning/reasoning or autonomous output generation.

## Conflict handling

These reports are not additive independent opinions. They are two outputs of the same self-report assessment mechanism using materially different questionnaire answers.

Therefore:

- `BG_LEGAL_QUICKSCAN_RECEIVED=PASS`
- `EXTERNAL_AI_ACT_ASSESSMENT_EVIDENCE_EXISTS=PASS`
- `BG_LEGAL_QUICKSCAN_CLASSIFICATION_CONSISTENT=false`
- `QUALIFIED_LEGAL_OPINION=false`
- `LEGAL_8_OF_8_CREDIT=0`
- `MASTER_LEGAL_OPINION_CREDIT=0`
- `FINAL_PRODUCT_AI_ACT_CLASSIFICATION=OPEN_RECONCILIATION_REQUIRED`

No buyer-facing material may present only one of the two reports as a definitive legal classification without explaining the answer scope and the contradictory self-report output.

## Current source/runtime factual check

A current-source search on protected `main` did not identify a Production application import/client integration for the OpenAI SDK or Vercel AI SDK generation primitives. References to `OPENAI_API_KEY` observed in the repository are associated with protected repository/CI automation and environment-secret guarding; OpenAI names also appear in tests/examples used to model customer AI-governance scenarios.

This is a source-level factual signal only. It does not prove that every deployed feature is outside the AI Act definition and does not decide the legal classification.

## Reconciliation rule

Before using a Quickscan classification externally, bind one questionnaire answer set to the actual accepted release and feature inventory. At minimum verify:

1. which RISCK COMPLY features generate, infer, recommend, classify or otherwise produce outputs beyond fixed deterministic rules;
2. whether any third-party model/API is actually invoked by the Production SaaS runtime;
3. whether any generative capability is customer-facing, internal-only or absent;
4. the operator role for each regulated feature rather than for the company in the abstract;
5. Article 50 applicability feature by feature;
6. whether future AI integrations change the answer set.

If the accepted release remains deterministic compliance software with no Production model invocation, the later minimal-risk/non-AI-system Quickscan may be relevant to that bounded release. If a model-driven feature is introduced or already exists outside the inspected source path, the earlier Article 50/provider path may become relevant. That determination remains evidence- and feature-specific.

## Buyer-safe wording

Permitted:

> RISCK COMPLY has received external EU AI Act Quickscan assessment outputs. The Quickscan is self-reported and not legal advice. Two same-day runs produced different classifications because the questionnaire answers differed, so final feature-level classification remains under reconciliation against the accepted Production release.

Not permitted:

- `BG Legal approved RISCK COMPLY`;
- `BG Legal certified RISCK COMPLY as compliant`;
- `RISCK COMPLY is definitively outside the AI Act`;
- `RISCK COMPLY is definitively an Article 50 provider`;
- any `LEGAL_8_OF_8` or Master Legal Opinion credit from these Quickscans alone.

## Current decision

`EXTERNAL_ZERO_COST_AI_ACT_ASSESSMENT_EVIDENCE=PASS_RECEIVED`  
`FINAL_AI_ACT_PRODUCT_CLASSIFICATION=OPEN`  
`QUALIFIED_LEGAL_ASSURANCE=OPEN`  
`ENTERPRISE_LEGAL_8_OF_8=0/8_ACCEPTED`
