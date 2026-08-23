# RISCK COMPLY — AI GOVERNANCE EVIDENCE MODEL V1

Status: READY_FOR_HUMAN_SHARE / EDUCATIONAL_ASSET
Checked: 2026-08-23
Marketing mode: PRELAUNCH_CONTROLLED

## Purpose

Provide a practical model for connecting an AI-governance decision to the evidence needed to understand, review and defend that decision later.

This model is not legal advice, a certification scheme, a legal classification engine or a compliance guarantee.

Core principle:

`FACT -> DECISION -> OWNER -> IMPLEMENTATION -> EVIDENCE -> REVIEW -> HISTORY`

A file is not evidence merely because it exists. Evidence becomes useful when a reviewer can understand **what it proves, for which system/use case, who relied on it, when it was valid and what changed afterward**.

---

## 1. Evidence record

Every material governance record should answer:

1. What AI system or use case does this relate to?
2. What decision, control or requirement is being evidenced?
3. Who owns the decision?
4. What facts were relied on?
5. What artifact or observation supports the conclusion?
6. Where is the authoritative source stored?
7. When was the evidence captured?
8. When should it be reviewed again?
9. What change would invalidate or reopen the review?
10. What happened after the evidence was reviewed?

---

## 2. Evidence taxonomy

### A. System facts

Examples:

- system/use-case description;
- business purpose;
- countries/regions;
- provider/model dependencies;
- data categories at a high level;
- deployment context;
- users/affected groups at a non-sensitive business level.

Purpose:

Establish the operating context that the rest of the governance record depends on.

### B. Decision rationale

Examples:

- role assessment rationale;
- risk-review rationale;
- control applicability rationale;
- approval rationale;
- exception rationale;
- policy interpretation note.

Purpose:

Preserve **why** the team reached a conclusion, not merely the conclusion itself.

### C. Implementation evidence

Examples:

- product configuration screenshot/reference;
- approved disclosure text;
- workflow state;
- control configuration;
- review checklist completion;
- technical or operational control evidence;
- release/change record.

Purpose:

Show that the governance decision was translated into an operational action.

### D. Provider / vendor evidence

Examples:

- vendor documentation;
- DPA/security documentation;
- model/provider terms;
- subprocessors;
- data-location statement;
- security questionnaire;
- assurance reports where legitimately available.

Purpose:

Support third-party dependency and procurement review.

### E. Internal accountability evidence

Examples:

- owner assignment;
- approver/reviewer;
- action/task completion;
- meeting/decision record;
- policy acknowledgement;
- escalation record.

Purpose:

Show who was accountable for the governance process.

### F. External assurance evidence

Examples:

- customer questionnaire response;
- procurement pack;
- security review response;
- external audit/review output;
- legal opinion or counsel review where legitimately available.

Purpose:

Show what was provided to or concluded by an external stakeholder.

Do not represent draft, self-authored or unaccepted material as independent assurance.

---

## 3. Evidence quality test

Score evidence using six questions. Do not turn the score into a certification.

### 1. Relevance

Does the artifact actually support the decision/control being reviewed?

### 2. Specificity

Is it tied to the correct AI system, use case, provider, environment or process?

### 3. Authority

Is the source authoritative enough for the claim being made?

### 4. Freshness

Was it valid at the time of the review, and is it still current?

### 5. Traceability

Can a reviewer see who relied on it and how it affected the governance decision?

### 6. Reproducibility

Could another qualified reviewer reconstruct the decision path without starting from zero?

Recommended internal states:

- `STRONG`
- `USABLE_WITH_CONTEXT`
- `STALE`
- `MISSING`
- `CONFLICTING`
- `NOT_APPLICABLE`

These are workflow states, not legal conclusions.

---

## 4. Evidence chain example

Example only:

```text
SYSTEM
Customer-support AI assistant

USE CASE
Respond to customer questions in web chat

DECISION
Transparency disclosure required for this deployment context

OWNER
Product + Compliance

RATIONALE
Role/use-case facts reviewed against current applicable guidance

IMPLEMENTATION
Disclosure added to user interaction

EVIDENCE
Approved copy + production implementation reference + reviewer record

REVIEW TRIGGER
Material UX/model/provider change

HISTORY
Initial review -> implementation -> later change review
```

The value is the **chain**, not the individual file.

---

## 5. Review packet structure

For a customer, board, procurement or internal review, assemble evidence in this order:

1. system/use-case facts;
2. accountable owner;
3. decision/rationale;
4. applicable governance requirement/control;
5. implementation evidence;
6. provider/vendor evidence where relevant;
7. open gaps/actions;
8. last review / next review;
9. change history.

Do not hide unresolved gaps. Mark them explicitly.

---

## 6. Common evidence failures

### Failure 1 — orphan PDF

A file exists in Drive but is not tied to a system, decision or review.

### Failure 2 — stale vendor document

A provider document was valid at onboarding but no one knows whether it is still current.

### Failure 3 — decision without rationale

A field says `low risk`, `approved` or `deployer`, but the supporting facts are missing.

### Failure 4 — evidence without owner

The artifact exists, but no person/team is accountable for reviewing or refreshing it.

### Failure 5 — implementation without proof

A team agreed to a control, but no evidence shows whether it was actually implemented.

### Failure 6 — external assurance overclaim

Self-authored or draft material is presented as independent validation.

---

## 7. Minimal evidence schema

```text
SYSTEM_ID=
USE_CASE_ID=
EVIDENCE_ID=
EVIDENCE_TYPE=
TITLE=
SOURCE=
AUTHORITATIVE_LOCATION=
RELATED_DECISION=
OWNER=
REVIEWER=
CAPTURED_AT=
VALID_FROM=
VALID_UNTIL=
LAST_REVIEWED_AT=
NEXT_REVIEW_AT=
REVIEW_TRIGGER=
STATUS=STRONG|USABLE_WITH_CONTEXT|STALE|MISSING|CONFLICTING|NOT_APPLICABLE
NOTES=
```

Do not put sensitive free text into marketing analytics.

---

## 8. Commercial conversation use

Use this asset when the buyer says:

- `we already have documents`;
- `our evidence is in Drive/SharePoint`;
- `customer questionnaires take too long`;
- `we have to reconstruct decisions every review`;
- `we cannot tell which evidence is still current`.

Diagnostic question:

> If I picked one material AI use case today, could your team reconstruct the facts, owner, decision rationale, implementation evidence and review history without asking five different teams?

---

## 9. RISCK COMPLY positioning boundary

Safe statement:

> RISCK COMPLY is designed to help teams connect AI systems/use cases with owners, governance context, evidence, actions and review history in one structured workspace.

Do not say:

- evidence in RISCK COMPLY proves legal compliance;
- an uploaded document automatically satisfies a regulatory obligation;
- evidence scoring is a certification or audit opinion.

---

## Current state

```text
EVIDENCE_TAXONOMY=READY
EVIDENCE_QUALITY_TEST=READY
REVIEW_PACKET=READY
MINIMAL_SCHEMA=READY
SALES_DIAGNOSTIC=READY
LEGAL_CLASSIFICATION=NOT_PROVIDED
COMPLIANCE_GUARANTEE=NO
```
