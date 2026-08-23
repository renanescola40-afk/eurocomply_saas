# RISCK COMPLY — ARTICLE 50 EVIDENCE OPERATING MAP V1

Status: READY_FOR_HUMAN_SHARE / OFFICIAL-SOURCE-BOUND EDUCATIONAL_ASSET
Checked: 2026-08-23
Marketing mode: PRELAUNCH_CONTROLLED

## Purpose

Turn Article 50 transparency questions into a traceable operating workflow that connects system/use-case facts, organisational role, transparency question, implementation evidence and review history.

This map does not provide legal advice, classify a specific system automatically, or guarantee compliance.

Core model:

`SYSTEM -> USE CASE -> ROLE -> ARTICLE 50 QUESTION -> OWNER -> IMPLEMENTATION -> EVIDENCE -> REVIEW`

---

## 1. Current official baseline

As of 2026-08-23:

- Article 50 transparency obligations apply from **2 August 2026**.
- The European Commission published final Article 50 transparency guidelines on **20 July 2026**.
- Providers of AI systems intended to interact directly with natural persons may have duties to ensure people are informed that they are interacting with AI, subject to Article 50 conditions and exceptions.
- Providers of systems generating synthetic audio, image, video or text have machine-readable marking/detectability obligations under Article 50(2), subject to scope and exceptions.
- Deployers have defined transparency duties for certain uses including emotion recognition/biometric categorisation, deepfakes, and certain AI-generated/manipulated text published to inform the public on matters of public interest.
- Article 50 does **not** mean `label every use of AI`.
- Role and obligation must be assessed per system, use case and factual context.
- For systems placed on the market before 2 August 2026, the relevant transition described by the Commission concerns the marking/detection obligations for AI-generated/manipulated content and runs to 2 December 2026; it is not a general extension of all Article 50 obligations.
- The voluntary Code of Practice supports Articles 50(2), (4) and (5); adherence does not itself constitute conclusive proof of compliance.

Primary official sources:

- European Commission — Guidelines on transparency obligations for providers and deployers of AI systems, 20 July 2026: https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems
- European Commission — Transparency obligations under Article 50 FAQ: https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act
- European Commission — Code of Practice on Transparency of AI-generated Content: https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content
- EUR-Lex — Regulation (EU) 2024/1689, Article 50: https://eur-lex.europa.eu/eli/reg/2024/1689/oj

Always re-check current official guidance before publication or legal reliance.

---

## 2. Decision map

### Question A — Does the system interact directly with natural persons?

If yes, review whether Article 50(1) applies to the provider in the factual context.

Operating record should capture:

- system/use case;
- user interaction context;
- provider identity/context;
- whether the interaction with AI is already obvious under the legal test;
- applicable exception analysis if relevant;
- owner/reviewer;
- disclosure decision;
- implementation evidence;
- review trigger.

Do not assume every interface requires the same wording.

### Question B — Does the system generate synthetic audio, image, video or text?

If yes, review Article 50(2) provider obligations around machine-readable marking/detectability, scope and exceptions.

Operating record should capture:

- generated content type;
- system/provider context;
- production/market date relevant to transition analysis;
- technical marking/detection approach;
- implementation evidence;
- exception/rationale if applicable;
- reviewer;
- change trigger.

### Question C — Is a deployer using emotion recognition or biometric categorisation?

If yes, assess the Article 50 deployer transparency duty in context.

Operating record:

- system/use case;
- deployer context;
- affected person/user context;
- disclosure approach;
- owner;
- implementation evidence;
- review history.

### Question D — Is the output a deepfake?

If yes, assess the deployer disclosure duty under Article 50(4), including relevant conditions/exceptions.

Operating record:

- content/use case;
- deployer context;
- publication/distribution channel;
- disclosure method;
- reviewer/owner;
- evidence of implementation;
- change/review trigger.

### Question E — Is AI-generated/manipulated text published to inform the public on a matter of public interest?

If yes, assess Article 50(4) in the factual context, including the role of human review/editorial responsibility and applicable exceptions.

Operating record:

- content/use case;
- public-interest context;
- deployer;
- human-review/editorial-control facts;
- disclosure conclusion/rationale;
- evidence;
- review history.

---

## 3. Provider vs deployer record

Never store only a company-level statement such as `we are a deployer`.

Recommended system/use-case record:

```text
SYSTEM=
USE_CASE=
ORGANISATION_ROLE_CONTEXT=
PROVIDER_FACTS=
DEPLOYER_FACTS=
MODIFICATION/REBRANDING_FACTS=
JURISDICTION/OUTPUT_CONTEXT=
RATIONALE=
OWNER=
REVIEWER=
EVIDENCE=
LAST_REVIEW=
NEXT_REVIEW=
CHANGE_TRIGGER=
```

A company may have different roles across different AI systems/use cases.

---

## 4. Evidence map

For each Article 50 conclusion, capture four evidence layers.

### Layer 1 — Facts

Evidence that establishes what the system/use case actually does.

Examples:

- product/use-case description;
- deployment configuration;
- content type;
- interaction flow;
- provider/model information.

### Layer 2 — Rationale

Evidence of how the team reached its conclusion.

Examples:

- reviewer note;
- applicable official guidance reference;
- role/context rationale;
- exception rationale where relevant.

### Layer 3 — Implementation

Evidence that the required operational action was implemented.

Examples:

- disclosure text/reference;
- UI implementation record;
- machine-readable marking configuration;
- publication workflow;
- approved template;
- deployment evidence.

### Layer 4 — Review history

Evidence that the conclusion remains governed over time.

Examples:

- review date;
- material-change trigger;
- model/provider change;
- UX/content change;
- policy/guideline update;
- owner/reviewer history.

---

## 5. Minimal Article 50 review packet

```text
1. System/use-case facts
2. Provider/deployer context
3. Relevant Article 50 question
4. Official source relied on
5. Rationale / exception analysis if relevant
6. Accountable owner + reviewer
7. Implementation decision
8. Implementation evidence
9. Open action/gap
10. Next review / material-change trigger
11. Decision history
```

This structure supports traceability; it does not itself prove that the legal conclusion is correct.

---

## 6. Change triggers

Reopen Article 50 review after potentially material changes such as:

- system begins direct user interaction;
- generated content type changes;
- new public-facing content use;
- introduction of emotion recognition/biometric categorisation;
- deepfake-related use case introduced;
- provider/model changed materially;
- organisation role changes through modification/rebranding/deployment structure;
- disclosure/marking implementation changes;
- relevant official Commission guidance changes.

---

## 7. Common failure modes

### `Article 50 = label all AI`

Too broad. Obligations differ by system, role and use case.

### Company-level role label

`We are a deployer` is too coarse when different products/use cases create different role facts.

### Disclosure without evidence

A policy says users will be informed, but no implementation record exists.

### Evidence without freshness

A disclosure/marking approach was approved once and never reviewed after product changes.

### Transitional-period overclaim

Treating 2 December 2026 as a general extension for all Article 50 obligations is unsafe.

### Code-of-Practice overclaim

Treating signature/adherence as conclusive proof of compliance is inaccurate.

---

## 8. Buyer workshop exercise

Pick one material AI use case and answer:

1. What does the system do?
2. Who is the provider/deployer in this context?
3. Which Article 50 question is actually relevant?
4. Who owns the conclusion?
5. Which official source/rationale supports it?
6. What operational action was implemented?
7. What evidence proves implementation?
8. What change reopens the review?

If the team cannot answer all eight without reconstructing context from several systems, the challenge is operational governance rather than merely regulatory awareness.

---

## 9. RISCK COMPLY positioning boundary

Safe statement:

> RISCK COMPLY is designed to help teams organise the system/use-case record around role context, governance rationale, evidence, actions and review history so Article 50 and other governance questions can be operated consistently.

Do not say:

- RISCK COMPLY automatically determines Article 50 duties;
- RISCK COMPLY guarantees Article 50 compliance;
- every professional use of AI creates the same transparency duty.

---

## Current state

```text
OFFICIAL_BASELINE_CHECKED=2026-08-23
ARTICLE_50_APPLICABLE_DATE=2026-08-02
DECISION_MAP=READY
ROLE_RECORD=READY
EVIDENCE_LAYERS=READY
REVIEW_PACKET=READY
CHANGE_TRIGGERS=READY
LEGAL_ADVICE=NO
AUTOMATIC_CLASSIFICATION=NO
COMPLIANCE_GUARANTEE=NO
```
