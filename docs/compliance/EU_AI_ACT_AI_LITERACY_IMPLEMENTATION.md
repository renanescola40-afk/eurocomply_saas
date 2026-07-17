# EU AI Act Article 4 — AI Literacy Implementation

Last reviewed: 2026-07-17

## Status

`IMPLEMENTED_UNVERIFIED` on branch `agent/ai-literacy-core` until the exact branch head passes all required CI, security and review gates and the migration is validated in an authorized Supabase environment.

This module supports AI literacy governance and evidence operations. It is not a legal opinion, certificate, regulatory approval or guarantee that a customer satisfies Article 4.

## Implemented workflow

1. Create an organization-scoped AI literacy programme.
2. Activate the programme with a durable audit event.
3. Create versioned courses with audience, risk, department, modules, passing score and validity.
4. Publish courses only when their programme is active and content exists.
5. Assign a published course to a named user or email.
6. Record completion, acknowledgement, assessment score and calculated validity.
7. Submit completion evidence using a tenant-scoped storage path or HTTPS location.
8. Require a different user to approve or reject submitted evidence.
9. Calculate coverage from completion, score, validity and approved evidence.

## Fail-closed scoring

An assignment contributes 100% only when all applicable conditions are met:

- status is completed;
- completion timestamp exists;
- acknowledgement is recorded;
- passing score is met when configured;
- training validity has not expired;
- at least one approved, unexpired evidence record exists.

Pending evidence is partial. Missing, overdue or expired assignments score zero. Revoked assignments are excluded. A waiver counts only when it contains a rationale, approving user and approval timestamp.

## Data and tenant boundaries

The module creates:

- `ai_literacy_programs`;
- `ai_literacy_courses`;
- `ai_literacy_assignments`;
- `ai_literacy_evidence`.

All records carry `organization_id`. Nested entities use composite foreign keys that include `organization_id`, preventing a course, assignment or evidence record from being linked to another tenant's parent record. Row-level security reuses the established organization membership helpers. Anonymous access is revoked.

## API security

`/api/ai-literacy` requires:

- authenticated user;
- current organization;
- explicit read or manage AI-governance permission;
- trusted origin for writes;
- distributed rate limiting;
- bounded JSON parsing with Zod;
- no-store responses;
- sanitized error handling;
- durable audit persistence.

Create operations are compensated with tenant-scoped deletion when the audit event cannot be persisted. State transitions restore their previous record when audit persistence fails. Compensation is best effort and runtime validation is still required.

## Evidence and separation of duties

Evidence starts in `submitted`. It cannot contribute to verified coverage until it becomes `approved`. The reviewer cannot be the same authenticated user that submitted the evidence. The review decision and its audit event must both persist; otherwise the evidence record is restored to its previous state.

## Product coverage accounting

- Verified `main` before this branch: **47%** EU AI Act product workflow/evidence coverage.
- This branch, after all checks and merge: **+2 percentage points**, bringing `main` to **49%** if merged alone.
- PR #1172 independently proposes **+3 percentage points** for the canonical classification engine.
- If both PRs merge after independent approval and exact-head validation: projected combined coverage is **52%**.

These percentages are an internal product implementation score, not customer legal-compliance status.

## Remaining Article 4 work

This vertical slice does not yet include:

- automatic population from organization members and contractors;
- role-to-course assignment rules;
- recurring reminders and notification delivery;
- quiz authoring and learner self-service session UI;
- bulk assignment/import;
- training analytics by department and AI system;
- signed PDF exports;
- runtime RLS evidence from the production Supabase project.

Those items must be implemented and verified before the Article 4 workstream can receive its full six weighted points.

## Rollback

Revert the API, dashboard, query modules, scoring module, tests, sidebar link, this document and migration. If the migration has already been applied, use an authorized, reviewed rollback plan that preserves or exports customer training records before dropping any table. Never drop production evidence automatically.
