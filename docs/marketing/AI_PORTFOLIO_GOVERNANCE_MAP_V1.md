# RISCK COMPLY — AI PORTFOLIO GOVERNANCE MAP V1

Status: READY_FOR_HUMAN_SHARE / EDUCATIONAL_ASSET
Checked: 2026-08-23
Marketing mode: PRELAUNCH_CONTROLLED

## Purpose

Give multi-product AI companies and enterprise AI teams a portfolio-level operating view across systems, use cases, owners, providers, evidence and review state.

This is not a legal classification map and does not determine regulatory status automatically.

Core model:

`PORTFOLIO -> SYSTEM -> USE CASE -> OWNER -> ROLE/RISK CONTEXT -> EVIDENCE -> REVIEW`

---

## 1. Why portfolio governance is different from product governance

A company can have strong governance inside each product team and still lack one reliable portfolio view.

Portfolio-level questions include:

- How many AI systems/use cases exist across the organisation?
- Which products/customers/jurisdictions do they affect?
- Who is accountable for each record?
- Which providers/models are shared dependencies?
- Which systems require review now?
- Which governance decisions are unresolved?
- Which customer/procurement evidence is reusable versus use-case specific?
- Where are material changes occurring?

---

## 2. Portfolio hierarchy

Recommended hierarchy:

```text
ORGANISATION
  -> AI PRODUCT / PLATFORM
      -> AI SYSTEM / AGENT / MODEL-ENABLED WORKFLOW
          -> USE CASE / DEPLOYMENT
              -> OWNER
              -> ROLE / RISK CONTEXT
              -> EVIDENCE
              -> REVIEW
```

Do not collapse every deployment into one vendor-level row when facts differ materially by use case.

---

## 3. Portfolio map fields

### A. Identity

- portfolio/product name;
- system name;
- use-case/deployment name;
- lifecycle state;
- country/region;
- business unit/customer context at a non-sensitive level.

### B. Accountability

- business owner;
- technical owner;
- compliance/legal reviewer;
- security/privacy reviewer where relevant;
- approval authority.

### C. Dependencies

- AI/model provider;
- hosting/provider dependency;
- important vendor/subprocessor dependency;
- integration surface;
- shared component used by multiple products.

### D. Governance context

- provider/deployer context to assess;
- risk/review state;
- transparency question where relevant;
- policy/control mapping;
- exceptions/open questions.

### E. Evidence

- rationale;
- implementation evidence;
- vendor/security evidence;
- customer/procurement evidence;
- external review where legitimately available.

### F. Review

- last review;
- next review;
- change trigger;
- open action;
- overdue state;
- review history.

---

## 4. Portfolio dashboard questions

A useful portfolio view should answer:

1. Which AI systems have no accountable owner?
2. Which use cases have missing or stale evidence?
3. Which systems share the same provider/model dependency?
4. Which records changed since last review?
5. Which products have unresolved role/risk questions?
6. Which customer deployments require procurement/security evidence?
7. Which records are due for review in 30/60/90 days?
8. Which systems are in production without completed governance review?
9. Which controls/actions are recurring across several products?
10. Which product teams are duplicating the same evidence work?

These are operating questions, not automatic legal conclusions.

---

## 5. Portfolio heat map

Recommended internal states:

### Ownership

- GREEN — accountable owner assigned
- AMBER — owner unclear/shared
- RED — no owner

### Evidence

- GREEN — current and traceable
- AMBER — usable but stale/partial
- RED — missing/conflicting

### Review

- GREEN — current
- AMBER — review due soon
- RED — overdue/material change pending

### Governance context

- GREEN — rationale captured
- AMBER — analysis open
- RED — material question unresolved

Do not present these colors as compliance status.

---

## 6. Change propagation model

Portfolio governance becomes valuable when a shared dependency changes.

Example:

```text
MODEL PROVIDER CHANGES TERMS / MODEL VERSION
        ↓
IDENTIFY AFFECTED SYSTEMS
        ↓
IDENTIFY AFFECTED USE CASES
        ↓
REOPEN RELEVANT REVIEWS
        ↓
REQUEST NEW EVIDENCE
        ↓
UPDATE OWNER / DECISION / HISTORY
```

Without dependency mapping, the team has to remember affected systems manually.

---

## 7. Portfolio review cadence

### Weekly operating review

- newly registered systems/use cases;
- overdue actions;
- material changes;
- missing owners;
- urgent customer/procurement requests.

### Monthly governance review

- stale evidence;
- systems due for review;
- provider/model changes;
- repeated exceptions;
- cross-product control gaps.

### Quarterly executive review

- portfolio size and trend;
- ownership coverage;
- review freshness;
- unresolved high-priority governance items;
- evidence readiness for customer/board review.

Do not turn an executive dashboard into a false single-number compliance score.

---

## 8. Example portfolio table

| Product | System/use case | Owner | Provider dependency | Governance state | Evidence state | Next review |
|---|---|---|---|---|---|---|
| Product A | Customer assistant | Product Ops | Model provider X | rationale captured | current | 30 Sep |
| Product A | Internal summarisation | IT | Model provider X | review open | partial | 10 Sep |
| Product B | Risk triage | Business Unit | Provider Y | rationale captured | stale | overdue |

Illustrative only.

---

## 9. Commercial diagnostic

Use this asset when the buyer has:

- multiple AI products;
- multiple agents/workflows;
- many enterprise deployments;
- shared providers/models;
- customer-specific assurance requirements;
- different teams governing AI independently.

Diagnostic question:

> If one shared model/provider changed materially tomorrow, could you identify every affected product/use case, owner, evidence pack and review obligation from one portfolio view?

---

## 10. RISCK COMPLY positioning boundary

Safe statement:

> RISCK COMPLY is designed to help organisations keep a structured portfolio of AI systems/use cases connected to owners, provider context, evidence, actions and review history.

Do not claim that portfolio status automatically determines AI Act classification or legal compliance.

---

## Current state

```text
PORTFOLIO_HIERARCHY=READY
PORTFOLIO_FIELDS=READY
HEAT_MAP=READY
CHANGE_PROPAGATION_MODEL=READY
REVIEW_CADENCE=READY
SALES_DIAGNOSTIC=READY
LEGAL_CLASSIFICATION=NO
COMPLIANCE_SCORE=NO
```
