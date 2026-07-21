# Quality Management System Governance

## Purpose

This domain helps organizations establish and operate an evidence-backed quality management system for AI governance. It organizes scope, policies, responsibilities, controlled documents and records, design controls, supplier oversight, data governance, risk management, post-market monitoring, incident handling, change control, competence, internal audits, management reviews, nonconformities and corrective actions.

It is a readiness and evidence-preparation workflow. It does not certify a QMS, replace an accredited conformity assessment, issue legal advice, authorize CE marking or guarantee compliance with the EU AI Act.

## Regulatory mapping

Primary mapping: EU AI Act Article 17. Related controls include Articles 4, 9, 10, 43, 72 and 73. The exact obligations depend on operator role, system classification, applicable conformity route and sector-specific law. Those conclusions require accountable human and legal review.

## Lifecycle

`draft -> planning -> operating -> management_review -> approval -> approved`

Blocking and terminal states:

- `blocked`: severe nonconformity or overdue corrective action prevents approval;
- `retired`: the QMS version is no longer effective and cannot authorize production use.

Approval is fail-closed. It requires an accountable owner, an independent reviewer, an approver, completed management review, no severe open nonconformities and no overdue corrective actions.

## Control families

1. QMS scope and quality policy;
2. accountability, roles and separation of duties;
3. document and record control;
4. design and development controls;
5. supplier and third-party controls;
6. data governance and dataset controls;
7. AI risk management integration;
8. post-market monitoring integration;
9. incident and corrective-action integration;
10. change and release control;
11. competence and AI-literacy integration;
12. internal audit;
13. management review;
14. nonconformity, root-cause and CAPA effectiveness;
15. regulatory and conformity strategy.

## Data model

- `ai_qms_systems`: versioned QMS scope, status and accountable approvals;
- `ai_qms_controls`: control inventory, ownership, test cadence and evidence digest;
- `ai_qms_nonconformities`: findings, containment, root cause, corrective action and independent verification;
- `ai_qms_decisions`: append-only material decision history.

Every record is organization scoped. Child records use organization-bound foreign keys. RLS is enabled and forced. Authenticated clients receive read-only access; mutations remain behind privileged server APIs. Actor-scope triggers reject users who do not belong to the record organization.

## Evidence and approval boundary

A QMS may reach `approved` only when:

- the control inventory is complete;
- blocking controls are effective;
- internal audit and management review are complete;
- severe nonconformities are closed or otherwise resolved through an accepted human process;
- corrective actions are not overdue and their effectiveness has been verified;
- owner, reviewer and approver are separated;
- the approval and effective date are recorded.

Repository implementation proves decision logic, schema constraints, RLS declarations, actor-scope controls and static tests. It does not prove production migration execution, live tenant isolation, the quality of customer evidence, audit competence, management effectiveness, regulatory acceptance or conformity.

## Claims

Safe language:

- QMS readiness;
- quality-governance workflow;
- evidence preparation;
- nonconformity and corrective-action tracking;
- conformity-readiness support.

Never claim:

- certified QMS;
- ISO certification;
- completed conformity assessment;
- authorized CE marking;
- guaranteed EU AI Act compliance;
- regulator-approved quality system.
