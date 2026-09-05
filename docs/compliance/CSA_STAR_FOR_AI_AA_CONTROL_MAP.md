# CSA STAR for AI — A&A Control-Level Readiness Map

Status: internal working document  
Framework: AICM v1.1  
Actor: Application Provider (AP)  
Domain: A&A — Audit & Assurance

> Important: this is a **control-level readiness map**, not a substitute for the official AI-CAIQ v1.1.0 question set. Final Yes/No/NA answers must be produced question-by-question from the official questionnaire.

## A&A-01 — Audit and Assurance Policy and Procedures

**AICM intent:** establish, document, approve, communicate, apply, evaluate and maintain audit/assurance policies and procedures, with at least annual or significant-change review.

### RISCK COMPLY evidence
- `docs/trust/ISO27001_SOC2_READINESS.md` — assurance-readiness evidence expectations.
- `docs/security/evidence/*` — multiple evidence contracts.
- `docs/compliance/QUALITY_MANAGEMENT_SYSTEM_GOVERNANCE.md` — quality/internal-audit governance integration.
- `docs/compliance/QMS_OPERATIONAL_WORKSPACE.md` — operational internal audit, CAPA and management-review model.
- enterprise audit/closeout reports and security assurance documentation.

### Gap
Repository evidence shows substantial audit/assurance mechanisms, but a single formally approved organization-level A&A policy with explicit annual review/communication/training evidence has not yet been established as canonical evidence.

**Preliminary direction:** `PARTIAL / evidence pending`; do not automatically answer all associated AI-CAIQ questions `Yes`.

---

## A&A-02 — Independent Assessments

**AICM intent:** conduct independent audit and assurance assessments according to relevant standards at least annually, using qualified independent assessors and preserved assessment evidence.

### RISCK COMPLY evidence
- independent penetration-test scoping material exists;
- internal security/enterprise audits exist;
- readiness documentation explicitly requires an external pentest/security review for stronger assurance.

### Gap
A scoped or planned independent assessment is not a completed independent assessment. Internal audits and automated security tooling are not independent assurance.

**Preliminary direction:** `NO` for questions requiring completed independent annual assessment, unless a completed third-party assessment report/retest becomes available before submission.

---

## A&A-03 — Risk Based Planning Assessment

**AICM intent:** perform independent assessments according to risk-based plans and after significant changes/emerging risks; for APs, emphasize integration security, input/output validation and user protection.

### RISCK COMPLY evidence
- `docs/security/THREAT_MODEL.md` — risk themes and abuse cases.
- enterprise readiness/closeout reports prioritize authorization, tenant isolation, billing, audit integrity and runtime controls.
- risk/governance modules and issue/remediation workflows exist.

### Gap
The risk-based planning structure exists internally, but the AICM control explicitly ties the activity to independent assessments. Independent execution remains unproven.

**Preliminary direction:** likely `NO/PARTIAL` depending on exact AI-CAIQ wording. Do not treat internal risk prioritization as independent assessment evidence.

---

## A&A-04 — Requirements Compliance

**AICM intent:** identify applicable legal/regulatory/contractual requirements, integrate them into governance, perform gap analysis and maintain audit/documentation evidence.

### RISCK COMPLY evidence
- `docs/compliance/EU_AI_ACT_GOVERNANCE_LIFECYCLE.md`.
- `src/server/ai-governance/governance-lifecycle.ts`.
- `docs/compliance/GDPR_OPERATIONAL_CONTROLS.md`.
- `docs/compliance/FRIA_FUNDAMENTAL_RIGHTS_GOVERNANCE.md`.
- `docs/compliance/ANNEX_IV_TECHNICAL_DOCUMENTATION.md`.
- `docs/compliance/GPAI_THIRD_PARTY_MODEL_GOVERNANCE.md`.
- regulatory/evidence/versioned governance mechanisms in the product/repository.

### Boundary
Product functionality that helps customers evaluate compliance is not, by itself, evidence that RISCK COMPLY as an organization has received a legal determination or external certification. Final answers must distinguish internal compliance identification/control operation from qualified external legal assurance.

**Preliminary direction:** `YES/PARTIAL` for internally operated identification/governance/documentation questions; `NO` where the question requires external confirmation not held.

---

## A&A-05 — Audit Management Process

**AICM intent:** define an audit-management process covering planning, risk analysis, control assessment, conclusions, remediation schedules, reports, historical evidence and both internal/external audit planning.

### RISCK COMPLY evidence
- `docs/compliance/QMS_OPERATIONAL_WORKSPACE.md` — internal audits, management review and CAPA workflow.
- QMS server/database implementation and approval gates.
- enterprise evidence manifests and closeout reports.
- remediation/evidence workstreams tracked through repository governance.

### Gap
The external-audit component is not complete, and evidence of a formal recurring external audit calendar has not been established.

**Preliminary direction:** `PARTIAL`; likely `Yes` for some internal-process questions and `No` for external/independence-specific questions.

---

## A&A-06 — Remediation

**AICM intent:** maintain a risk-based corrective-action process, assign owners/deadlines, verify fixes, report status and continually improve.

### RISCK COMPLY evidence
- `docs/compliance/QMS_OPERATIONAL_WORKSPACE.md` states the CAPA record stores containment, root cause, corrective action, independent verification and closure timestamps.
- `supabase/migrations/20260722223000_qms_operational_workflow.sql` enforces QMS/CAPA gates.
- `supabase/migrations/20260722234000_qms_operational_transition_hardening.sql` requires an independent verifier distinct from the CAPA owner for relevant transitions.
- QMS dashboard exposes open CAPA, accepted audits, approved reviews, severe findings and overdue corrective actions.

### Boundary
A product feature capable of managing CAPA does not automatically prove every organizational audit finding is operated through the process. Final evidence should identify actual organizational adoption/runtime records if the AI-CAIQ question requires operational use rather than capability.

**Preliminary direction:** `YES/PARTIAL`, with strong implementation evidence but runtime/adoption proof required for operational-use questions.

---

# Domain conclusion

A&A is **not a clean all-Yes domain** today.

Strongest current areas:
- requirements/governance integration;
- internal audit-management mechanisms;
- CAPA/remediation implementation and verification controls.

Weakest current areas:
- completed independent assessment;
- recurring external audit evidence;
- canonical approved A&A policy/annual communication/training evidence.

The correct STAR Level 1 strategy is to disclose these boundaries accurately rather than manufacture assurance.
