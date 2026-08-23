# RISCK COMPLY — TECHNICAL VS OPERATIONAL AI GOVERNANCE MAP V1

Status: READY_FOR_HUMAN_SHARE / EDUCATIONAL_ASSET
Checked: 2026-08-23
Marketing mode: PRELAUNCH_CONTROLLED

## Purpose

Clarify the boundary between technical/runtime AI governance and cross-functional operational governance so buyers can see where observability, policy enforcement and model controls end — and where ownership, evidence, procurement and organisational review begin.

This is a complementary-layer model, not a claim that technical governance platforms are incomplete or inferior.

Core principle:

`RUNTIME CONTROL != ORGANISATIONAL GOVERNANCE RECORD`

Both layers can be necessary, and in mature environments they should connect.

---

## 1. Technical/runtime governance

Typical scope:

- model/agent observability;
- traces/logs;
- prompt/output monitoring;
- policy enforcement;
- runtime guardrails;
- evaluation metrics;
- drift/performance monitoring;
- environment/deployment controls;
- technical access controls;
- model/provider configuration;
- automated testing/evaluation;
- runtime incidents.

Primary question:

> Is the AI system behaving within the technical policies and performance boundaries we expect?

Primary owners often include:

- engineering;
- ML/AI platform;
- product;
- SRE/platform;
- security.

---

## 2. Operational/cross-functional governance

Typical scope:

- AI system/use-case inventory;
- business owner;
- provider/deployer context to assess;
- governance/risk rationale;
- legal/compliance review;
- procurement/customer assurance;
- policies/approvals/tasks;
- evidence packs;
- review dates/change triggers;
- board/customer/audit questions;
- historical accountability.

Primary question:

> Can the organisation explain who owns this AI use case, why it is approved, what evidence supports that decision, and when it must be reviewed again?

Primary owners often include:

- AI Governance;
- Compliance;
- Legal/Privacy;
- Security/GRC;
- Procurement;
- business owner;
- executive oversight.

---

## 3. Boundary map

| Question | Technical/runtime layer | Operational governance layer |
|---|---|---|
| What is running? | deployment/model/agent telemetry | system/use-case inventory |
| Is it behaving correctly? | evaluation, observability, guardrails | review outcome / business acceptability |
| Who owns it? | technical owner/operator | accountable business/governance owner |
| Which provider/model is used? | runtime/provider configuration | provider dependency + governance context |
| What changed? | deployment/version/trace history | governance change trigger + review history |
| What rule applies? | technical policy/guardrail | legal/policy/control applicability analysis |
| What proves the control? | logs/evaluations/configuration | evidence chain tied to decision/owner |
| What does procurement need? | security/technical evidence | customer/procurement pack + accountable response |
| When to review? | runtime threshold/event | scheduled/material-change governance review |
| Who approved the use case? | usually outside runtime tool | explicit approval/rationale/history |

---

## 4. The handoff problem

Many organisations already have strong technical signals but still reconstruct the organisational answer manually.

Typical path:

```text
RUNTIME TRACE / EVALUATION
        ↓
SECURITY OR PRODUCT INTERPRETS IT
        ↓
LEGAL/COMPLIANCE ASKS FOR CONTEXT
        ↓
BUSINESS OWNER EXPLAINS USE CASE
        ↓
PROCUREMENT/CUSTOMER ASKS FOR EVIDENCE
        ↓
TEAM ASSEMBLES ANSWER FROM MULTIPLE SYSTEMS
```

A mature model links these layers instead of replacing one with the other.

---

## 5. Connection model

Recommended linkage:

```text
OPERATIONAL RECORD
System / Use Case / Owner / Governance Rationale
        ↓
TECHNICAL RECORDS
Deployment / Model / Agent / Runtime Controls / Evaluations
        ↓
EVIDENCE LINK
What technical record supports which governance decision?
        ↓
REVIEW
What change should reopen organisational review?
```

Examples of change triggers:

- model/provider change;
- new deployment region;
- new customer/use case;
- material guardrail/evaluation failure;
- new data category;
- major product functionality change;
- material policy/regulatory change.

---

## 6. Complementarity test

A technical governance platform and RISCK COMPLY may be complementary when:

- runtime telemetry is strong;
- technical policy enforcement exists;
- engineering can explain what happened technically;
- but Compliance/Legal/Procurement still lack one system-of-record for owner, rationale, evidence and review status.

They may overlap more directly when the technical platform already provides full cross-functional inventory, ownership, approvals, evidence and organisational review workflows.

Never claim complementarity without inspecting the buyer's actual operating model.

---

## 7. Diagnostic questions

### For CTO / AI Platform

> When a runtime control changes or fails, what process decides whether the business/governance review must reopen?

### For Compliance / Legal

> Can you reach the relevant runtime evidence from the governance decision record without asking engineering to reconstruct it?

### For Security / Procurement

> When a customer asks for AI assurance, can you connect security/runtime proof to the exact system/use case and accountable owner?

### For Product

> Does a new use case automatically create or update the governance record, or does governance happen later through a separate manual process?

---

## 8. Example

```text
AI AGENT
Customer-support agent

TECHNICAL LAYER
- model version
- tool permissions
- evaluation results
- guardrails
- traces
- deployment history

OPERATIONAL LAYER
- business purpose
- accountable owner
- customer/use-case context
- governance rationale
- transparency question
- approval state
- evidence pack
- next review

LINK
Evaluation failure or model/provider change -> reopen governance review
```

---

## 9. Commercial use

Best for buyers who already have:

- agent platforms;
- observability;
- guardrails;
- runtime policy engines;
- model registries;
- technical governance tooling.

Do not pitch them as if they have `no governance`.

Position the conversation around **handoff and accountability across technical and business functions**.

Safe statement:

> RISCK COMPLY focuses on the operational record around AI systems and use cases — ownership, governance context, evidence, actions and review history — and can sit alongside technical/runtime controls where those already exist.

---

## Current state

```text
TECHNICAL_LAYER_MAP=READY
OPERATIONAL_LAYER_MAP=READY
BOUNDARY_MATRIX=READY
HANDOFF_MODEL=READY
CHANGE_TRIGGER_MODEL=READY
COMPLEMENTARITY_TEST=READY
COMPETITOR_REPLACEMENT_CLAIM=NO
```
