# Data governance, privacy and auditability megapack

- Status: Proposed
- Date: 2026-07-20
- Scope: retention, data-subject requests, tenant isolation, audit integrity and evidence

## Context

Privacy documents alone do not prove that retention, deletion, export, request deadlines or audit integrity are enforced. The platform needs tenant-scoped operational records and exact-SHA runtime evidence without copying personal data into CI artifacts.

## Decision

Introduce three tenant-scoped governance primitives:

1. `data_retention_policies` for category-specific legal basis, retention windows and deletion mode.
2. `data_subject_requests` for access, export, rectification, restriction, deletion and objection workflows with a default 30-day due date.
3. `audit_integrity_checkpoints` for chained SHA-256 aggregate checkpoints over audit-event ranges.

All tables use RLS. Members may read within their organization, while owner/admin roles manage policies, process requests and create integrity checkpoints. A protected workflow validates schema, RLS, policies, constraints, retention configuration, residency declaration and evidence redaction against an isolated database.

## Safety constraints

- Runtime proof uses the isolated recovery database, not production mutation.
- No rows, subject identifiers, exports, connection strings or personal data enter evidence.
- Evidence is exact-SHA bound and fails closed.
- Export encryption and residency are protected configuration attestations, not inferred from documentation.

## Evidence boundary

The proof demonstrates that governance primitives, tenant policies and safety constraints exist in the tested database. It does not prove completion of a real customer data-subject request or legal sufficiency for every jurisdiction.
