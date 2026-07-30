# Risck Comply — Counsel Review Cockpit

**Preparation status:** `READY_FOR_COUNSEL_HANDOFF` when the existing strict preparation gates pass.  
**Legal acceptance:** `HUMAN_REVIEW_REQUIRED`.  
**Customer-specific compliance:** not assessed by this package.  
**Formal conformity:** not assessed unless a specific system and pathway are supplied.

## 1. Ten-minute reading order

1. Read `01_PRODUCT_DOSSIER.md` and `02_INTENDED_PURPOSE.md`.
2. Confirm or amend the preliminary product classification in `06_RISCK_COMPLY_AI_ACT_CLASSIFICATION_MEMO.md`.
3. Review the global decisions below.
4. Use the generated counsel delta to identify affected workstreams.
5. Open only the affected `review-packages/<id>/PACKAGE.md` files.
6. Review the contract/privacy drafts only where the delta identifies a material change.
7. Record decisions in the existing final decision sheet and signed external artifacts.

## 2. Product position proposed for review

Risck Comply is a B2B software platform that supports AI governance operations, EU AI Act readiness, inventory, classification support, evidence preparation, workflow management and reporting.

The proposed position is that the platform:

- provides operational and evidentiary support;
- may apply deterministic rules and AI-assisted drafting;
- does not provide a universal legal conclusion;
- does not guarantee customer compliance;
- does not replace counsel, a regulator or a notified body;
- does not automatically authorise CE marking, registration or conformity;
- must escalate ambiguous, high-impact and customer-specific decisions.

Counsel must confirm whether this intended purpose and each actual production feature remain consistent with that position.

## 3. Global decisions

Use one of: `ACCEPTED`, `ACCEPTED_WITH_CHANGES`, `CHANGES_REQUIRED`, `REJECTED`, `OUTSIDE_SCOPE`.

| Decision | Question | Proposed position | Evidence |
|---|---|---|---|
| G-01 Intended purpose | Is the product correctly described as operational readiness support rather than final legal decision-making? | Accept with limitations and prominent no-legal-advice boundary. | Intended purpose, feature inventory, public claims register. |
| G-02 Product role | Which AI Act role or roles apply to Risck Comply for each production feature? | Determine per feature; do not assign one universal role without analysis. | Classification memo, architecture and provider inventory. |
| G-03 Risk classification | Does any product feature create or materially modify a high-risk intended purpose? | No high-risk claim unless customer context or product purpose changes. | Classification memo and feature routes. |
| G-04 Launch stance | May the product launch as controlled B2B readiness software before final counsel acceptance? | Only with review-draft legal pages, conservative claims and no regulated-customer guarantee. | Legal readiness, Trust Center, Terms and Privacy drafts. |
| G-05 Public claims | Are allowed, conditional and prohibited claims correctly classified? | Evidence-bound readiness language only. | Claims register and public-claims gate. |
| G-06 Contract pack | Are Terms, MSA assumptions, service schedule and reviewer terms sufficient for the intended launch? | Counsel redline required before contractual reliance. | Legal pack. |
| G-07 Privacy and DPA | Are roles, lawful bases, transfers, retention, incident terms and subprocessors correctly represented? | Founder facts and production-provider verification required. | DPA, privacy draft, data inventory, subprocessor draft. |
| G-08 Partner counsel model | Is the proposed collaboration compatible with independence and professional rules? | Separate services and fees; no assumed sharing of legal fees or control of legal conclusions. | Partner agreement draft and boundaries. |
| G-09 Reliance | Who may rely on counsel's review, for what purpose and for how long? | Risck Comply product-methodology reliance only unless expressly expanded. | Master opinion handoff. |
| G-10 Change triggers | Which later product, legal, provider or data-flow changes require re-review? | Apply the material-change policy and exact-SHA delta. | Change-impact policy and generated delta artifact. |

## 4. Eight workstream decisions

| Workstream | Weight | Primary question | Default state |
|---|---:|---|---|
| Legal rules | 4 | Are sources, precedence, application dates and limitations defensible? | `HUMAN_REVIEW_REQUIRED` |
| Prohibited practices | 7 | Are Article 5 triggers, conditions, exceptions and escalations correctly represented? | `HUMAN_REVIEW_REQUIRED` |
| Article 50 | 8 | Are transparency duties, roles, timing and wording correctly represented? | `HUMAN_REVIEW_REQUIRED` |
| FRIA | 6 | Does the workflow cover applicability, rights, consultation, mitigation and residual risk without conflating FRIA and DPIA? | `HUMAN_REVIEW_REQUIRED` |
| Deployer obligations | 7 | Are deployer duties complete and separated from provider duties? | `HUMAN_REVIEW_REQUIRED` |
| High-risk provider | 9 | Does the workflow support Articles 8–21 without implying software use alone proves compliance? | `HUMAN_REVIEW_REQUIRED` |
| Conformity | 5 | Are internal-control, notified-body, declaration, CE and registration gates represented without automatic approval? | `HUMAN_REVIEW_REQUIRED` |
| GPAI | 5 | Are provider, integrator and user obligations correctly separated, including systemic-risk conditions? | `HUMAN_REVIEW_REQUIRED` |

## 5. Information counsel should not need to rediscover

The handoff bundle already indexes:

- product and architecture descriptions;
- intended purpose;
- route and feature inventory;
- security controls;
- preliminary classification;
- official-source register;
- article-to-evidence matrix;
- eight workstream packages;
- founder-facts questionnaire;
- Terms, Privacy, DPA, subprocessors and service drafts;
- claims register;
- final decision templates;
- exact-SHA package digest.

Counsel should still check primary sources and exercise independent judgment.

## 6. Founder facts that block final documents

Do not ask counsel to infer:

- legal entity and registration details;
- address, VAT and legal contacts;
- exact markets and customer types;
- production subprocessors and regions;
- commercial terms, renewals, refunds and trials;
- real support capacity and incident commitments;
- AI model providers and data-use settings;
- retention periods and transfer mechanisms;
- insurance and dispute forum.

Missing facts remain `FOUNDER_FACT_REQUIRED`.

## 7. Counsel output expected

Counsel should return:

1. global decision sheet;
2. one decision per affected workstream;
3. redlines for affected legal documents;
4. mandatory remediation findings;
5. non-blocking recommendations;
6. permitted reliance and exclusions;
7. validity period and change triggers;
8. signed artifact reference and digest.

## 8. No false finality

A positive product-methodology review does not establish that every customer is compliant. Each customer remains responsible for accurate facts, applicability, implementation and any formal conformity or regulator-facing procedure required for its systems.