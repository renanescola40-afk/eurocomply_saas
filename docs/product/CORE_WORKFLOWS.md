# Core Product Workflows

This document describes the practical B2B SaaS workflows that must work with real persistence, organization scoping and auditability. The product should not present compliance as legally guaranteed; it provides structured readiness, evidence and workflow support for European organizations preparing for AI governance obligations.

## Product principle

Every core workflow must be backed by persisted organization data. A button is only allowed when it either performs an action, opens a real route, downloads a real artifact, or clearly explains why the action is unavailable. Metrics must be derived from organization-scoped data, not hard-coded marketing numbers.

## 1. Organization activation

Primary path:

1. User signs in.
2. User is routed to onboarding if they do not have an organization.
3. User creates or joins an organization.
4. The organization becomes the tenant boundary for every product area.
5. Dashboard and product modules read data through the current organization.

Required controls:

- `organization_id` must be present on mutable records.
- RBAC must be checked before write operations.
- Empty states must guide the user toward the first real action.

## 2. AI Inventory

Primary path:

1. User opens AI systems inventory.
2. User registers a system with name, owner, category, country/market, processed data, vendor, model, use case, lifecycle status, role and risk signals.
3. The API persists the system under the current organization.
4. The classifier calculates initial AI Act exposure.
5. The system appears in the inventory list with risk, owner, market, vendor/model and next actions.
6. User opens the system detail page.
7. The detail page shows system facts, data processed, classification explanation, obligations, next actions and history.

Implemented data fields:

- `name`
- `owner_team`
- `category`
- `country_market`
- `processed_data`
- `vendor_name`
- `model_name`
- `use_case`
- `role`
- `lifecycle_status`
- `risk_domain`
- risk signal booleans
- `risk_level`
- `classification_summary`
- `obligations`
- `next_actions`
- `last_reassessed_at`

Reassessment path:

1. Client or future edit UI sends a `PATCH /api/ai-systems/:id` request with updated facts.
2. API validates organization membership and `manage_ai_governance` permission.
3. API recalculates classification.
4. API updates the system and appends history.
5. API records an audit event without exposing sensitive payload contents.

## 3. Risk Classification

The initial classifier maps supplied facts into product-safe classifications:

- `minimal_or_low`
- `limited_transparency`
- `high_risk_review`
- `prohibited_review`

The product wording intentionally says review/assessment rather than guaranteeing legal status. Each classification includes:

- explanation summary
- obligations to check
- next actions
- audit metadata for create/reassessment

## 4. Readiness Score

Readiness is calculated from organization data. It should incorporate coverage and gaps from real records such as AI systems, incidents, assessments, documents and tasks where available.

The dashboard must expose:

- current readiness score or not-assessed state
- coverage areas
- gaps
- recommendations
- next-best actions
- trend/history when snapshots exist

## 5. Documents and Evidence

Primary path:

1. Product identifies required documents based on inventory, risks and onboarding answers.
2. Documents have owner, status and due/expiry metadata.
3. Approved/generated artifacts can be downloaded only where a real export exists.
4. Evidence packs should combine documents, inventory summaries, risk records and audit timeline references.

Allowed document statuses:

- `draft`
- `review`
- `approved`
- `expired`
- archived/internal states only when explicitly represented in the UI

## 6. Tasks

Primary path:

1. Onboarding and governance triggers create tasks.
2. User can create manual tasks.
3. User can mark work complete through the task workflow.
4. Tasks can be related to an AI system, risk, document or vendor when schema support exists.
5. Task actions are audited and scoped by organization.

Minimum task fields:

- title
- description
- status
- priority
- assignee/owner
- due date
- category/relationship

## 7. Vendors

Primary path:

1. User registers vendor/model provider.
2. Vendor has review status and risk level.
3. Due diligence checklist tracks whether review is complete.
4. Vendor can be connected to AI systems.

Required vendor fields:

- name
- website or identifier
- country
- category
- risk level
- review status
- next review date where supported

## 8. Reports

Primary path:

1. User opens organization report area.
2. Product summarizes readiness by organization.
3. Export is offered only for implemented artifact types such as CSV routes.
4. PDF export must not be shown as available unless implemented and tested.

Executive readiness report should include:

- readiness score
- top risks
- AI inventory summary
- missing/expiring documents
- open tasks
- vendor review status
- audit timeline summary
- clear disclaimer that this is readiness support, not guaranteed legal advice

## 9. Audit Timeline

Primary path:

1. Important actions write audit events.
2. Timeline displays action, entity type, actor reference and timestamp.
3. Timeline is organization-scoped.
4. Sensitive payloads must be summarized and not exposed in full.

Events to record:

- organization created
- AI system created
- AI system reassessed
- task created/updated/deleted
- document approved/downloaded
- vendor reviewed
- RBAC denial/security failure

## Acceptance workflow

A company should be able to:

1. Sign in.
2. Create or select an organization.
3. Register an AI system with practical business facts.
4. See an initial risk classification with explanation and next actions.
5. View recommended documents and tasks.
6. Understand readiness score/gaps.
7. Open an audit-backed detail/timeline view.

## Current implementation notes

- AI inventory now persists owner, category, country/market, processed data, vendor and model facts.
- AI system detail page is real and scoped by organization.
- Reassessment backend exists through `PATCH /api/ai-systems/:id` and writes history/audit metadata.
- UI editing can be expanded further on top of the reassessment API.
- Supabase migrations must be applied before the new fields are available in production.
