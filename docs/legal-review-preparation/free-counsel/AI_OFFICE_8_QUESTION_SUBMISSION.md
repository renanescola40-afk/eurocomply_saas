# RISCK COMPLY — AI Office / AI Act Service Desk Question Pack

**Status:** `READY_TO_SUBMIT_WITH_EU_LOGIN`  
**Purpose:** obtain official implementation guidance from the European Commission AI Office / AI Act Service Desk.  
**Legal-credit boundary:** AI Office guidance is retained as an `AUTHORITATIVE_GUIDANCE_SOURCE`; it does not by itself create an independent counsel opinion or `LEGAL_8_OF_8` acceptance.

## Submission channel

The AI Act Service Desk allows stakeholders to submit questions to the AI Office through its online form. EU Login is required. Questions may be submitted in any official EU language and replies are provided by email.

Official entry point:

`https://ai-act-service-desk.ec.europa.eu/en/ai-act-service-desk`

Use the current consolidated AI Act text and current AI Office guidance at the date of submission. Do not rely on a frozen historical legal text if a newer consolidated version exists.

## Product context to paste with each request

> RISCK COMPLY is an early-stage B2B SaaS intended to help organisations manage AI-governance records, evidence, assessments, transparency, FRIA/high-risk workflows and auditability for the EU market. The product is intended as governance/evidence and decision-support software rather than a substitute for legal advice or a system making final decisions about natural persons. Most current functions are deterministic software; individual AI-enabled features may integrate third-party models and require module-level classification. We are seeking implementation guidance so that our product boundaries and customer-facing workflow do not misstate obligations under Regulation (EU) 2024/1689 as currently applicable.

Do not include private founder identity, NIF/tax identifiers, secrets or customer personal data in the submission.

---

# Q1 — Product role / AI-system qualification / legal rules

**Canonical workstream:** `legal-rules`

> For a B2B compliance-operations SaaS whose core functions are deterministic records, rules, scoring, evidence management and document/workflow assembly, but which may expose individual features that call third-party AI models, what is the appropriate module-level method for determining (a) whether a specific feature is an “AI system” under the current AI Act definition and (b) whether the SaaS operator is acting as provider, deployer, downstream provider, importer/distributor or another operator role? In particular, which facts about inference, intended purpose, branding, integration, fine-tuning, modification and control should determine the role, rather than treating the entire SaaS as one AI system?

**Requested guidance:** practical factors / examples and any current AI Office guidance that should govern the analysis.

---

# Q2 — Article 5 prohibited practices

**Canonical workstream:** `prohibited-practices`

> RISCK COMPLY is intended to identify, document and escalate potential prohibited-practice risks in customer AI use cases, not to authorise those use cases. What implementation boundary should a compliance-operations tool follow when translating Article 5 conditions and exceptions into software? Is it appropriate to use fail-closed “potentially prohibited / human review required” outcomes when customer facts are incomplete, and what cautions are necessary to avoid a software workflow being interpreted as an authoritative legal approval of an exception?

**Requested guidance:** current expectations for software tools that operationalise Article 5 checks and any examples of acceptable escalation/qualification language.

---

# Q3 — Article 50 transparency

**Canonical workstream:** `article-50-copy`

> Where a B2B SaaS exposes an interactive AI assistant or uses an AI system to generate or manipulate text/content for users, how should Article 50 obligations be allocated between the SaaS provider and its business customer/deployer? Please clarify, where possible, (a) notices for direct human interaction with an AI system, (b) machine-readable marking/detection duties for synthetic content, (c) disclosure duties for deepfakes and AI-generated/manipulated text published to inform the public on matters of public interest, and (d) whether internally generated B2B compliance drafts that are not published to inform the public trigger the same disclosure requirement.

**Requested guidance:** role-specific triggers, timing and practical disclosure expectations under the rules currently applicable.

---

# Q4 — FRIA assistance boundary

**Canonical workstream:** `fria-methodology`

> RISCK COMPLY may provide a structured workflow that helps a customer collect facts and draft a Fundamental Rights Impact Assessment where the customer is a deployer subject to the relevant AI Act requirement. Can a software vendor provide such a structured methodology without becoming responsible for the customer’s substantive FRIA, provided the tool clearly states that the customer remains responsible for the assessment and any required consultation/notification? What minimum elements or warnings should such a tool include so that it assists rather than falsely represents completion or legal sufficiency of the customer’s FRIA?

**Requested guidance:** allocation of responsibility and practical expectations for FRIA-support tooling.

---

# Q5 — Deployer obligations

**Canonical workstream:** `deployer-obligations`

> Where RISCK COMPLY is used by a business customer to manage evidence and workflows for AI systems that the customer deploys, which AI Act deployer obligations remain solely with that customer and which, if any, could attach to RISCK COMPLY merely because it provides governance software? Would the analysis change if a RISCK COMPLY feature uses AI to recommend risk classifications or remediation steps but does not make or execute the customer’s underlying high-impact decision?

**Requested guidance:** distinction between a governance-tool vendor’s obligations and the deployer obligations of customers, including circumstances that could change RISCK COMPLY’s role.

---

# Q6 — High-risk provider / downstream-provider boundary

**Canonical workstream:** `high-risk-provider`

> A customer may use RISCK COMPLY to document or govern an AI system used in an Annex III/high-risk context. Does that use, by itself, create provider or high-risk-system obligations for the RISCK COMPLY platform? Please clarify the circumstances in which a governance SaaS could itself become a provider/downstream provider of a high-risk AI system because of intended purpose, branding, integration with a model/system, substantial modification, or functionality that directly evaluates/ranks/recommends outcomes about natural persons in a listed high-risk context.

**Requested guidance:** practical thresholds and examples for separating “tool used to govern a high-risk system” from “high-risk AI system/provider”.

---

# Q7 — Conformity / CE / registration boundary

**Canonical workstream:** `conformity`

> RISCK COMPLY may provide workflows/checklists that help customers assemble technical documentation, conformity evidence or registration information for AI systems for which the customer or another party is the provider. Under what circumstances, if any, would merely providing this compliance-operations tooling make RISCK COMPLY responsible for conformity assessment, EU declaration of conformity, CE marking or registration? What wording/boundaries should the tool preserve to make clear that it assists the legally responsible provider rather than performing an official conformity assessment or acting as a notified/conformity body?

**Requested guidance:** responsibility boundary and any specific cautions for commercial compliance-support software.

---

# Q8 — GPAI integration / downstream obligations

**Canonical workstream:** `gpai`

> If RISCK COMPLY integrates a third-party general-purpose AI model through an API to provide drafting, classification suggestions or assistance, while the original model is developed and placed on the market by the third-party provider, which AI Act obligations normally remain with the GPAI model provider and which may attach to RISCK COMPLY as an AI-system provider or downstream provider? Which activities — e.g. rebranding, fine-tuning, substantial modification, model redistribution/placing on the market, or changing intended purpose — are most relevant to whether RISCK COMPLY takes on additional provider/GPAI obligations?

**Requested guidance:** documentation/information RISCK COMPLY should obtain from the upstream model provider and the key role-change triggers.

---

## Internal routing after a reply

For each AI Office response:

1. retain the original email/ticket reference privately;
2. record date and question/workstream;
3. compare the answer with the current workstream package;
4. classify the response as `AUTHORITATIVE_GUIDANCE_SOURCE`;
5. route any required product/document change to engineering/legal preparation;
6. do **not** mark the workstream `ACCEPTED` solely because the AI Office answered;
7. present the guidance to the eventual qualified reviewer so counsel does not need to research the same implementation question from zero.

## Current status

```text
AI_OFFICE_QUESTION_PACK=READY
EU_LOGIN_FORM_SUBMISSION=HUMAN_BROWSER_STEP_REQUIRED
AI_OFFICE_RESPONSES=OPEN
LEGAL_8_OF_8=0/8_ACCEPTED
```
