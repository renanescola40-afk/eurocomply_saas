# QMS Operational Workspace

## Purpose

The QMS workspace turns the existing Article 17 governance model into a tenant-scoped operational workflow for quality policy, controls, corrective and preventive action, internal audits, management review and final approval.

## Customer route

`/[locale]/dashboard/qms`

## API

`GET /api/ai-governance/qms`

`POST /api/ai-governance/qms?workflow=system_create|control_create|nonconformity_create|audit_create|management_review_create|system_approve`

## Approval boundary

Approval is fail closed. A QMS cannot be approved unless:

- scope, quality policy and regulatory strategy are substantive;
- owner, reviewer and approver are separated;
- at least one control exists and every control is effective or not applicable;
- at least one internal audit has been independently accepted;
- at least one management review has been independently approved;
- no high or critical nonconformity remains unresolved;
- no corrective action is overdue;
- the authenticated approver matches the recorded approver;
- optimistic concurrency confirms the record was not changed after review;
- approval and the append-only decision are committed in one transaction.

## CAPA

The existing `ai_qms_nonconformities` table is the CAPA record. It stores containment, root cause, corrective action, independent verification and closure timestamps. Database triggers derive severe-open and overdue-action counters directly from the records.

## Audit and management review

`ai_qms_audits` stores planned and completed audits, findings, independent acceptance and digest-backed reports.

`ai_qms_management_reviews` stores the review period, required inputs, decisions, action items, independent review and approval evidence.

## Security

- authenticated tenant-scoped reads;
- `read_ai_governance` and `manage_ai_governance` RBAC;
- trusted Origin for mutations;
- bounded Zod payloads;
- distributed fail-closed rate limiting;
- forced RLS;
- same-organization actor validation;
- service-role-only operational RPCs;
- durable audit events and rollback of newly-created records when audit persistence fails;
- no-store responses and sanitized errors.

## Truth boundary

This workflow supports Article 17 readiness, evidence preparation and accountable quality operations. It does not certify the QMS, prove control effectiveness, replace an external audit or guarantee regulator or notified-body acceptance.
