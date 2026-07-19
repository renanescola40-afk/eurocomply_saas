# Harden document server-action mutation boundary

- Date: 2026-07-19
- Status: Proposed
- Priority: P0

## Context

The canonical document register submits uploads through a server action. That path validated permissions and file content but did not enforce the organization's document quota, used a limiter without explicit fail-closed production context, selected every database column and treated audit logging as best effort.

A document row could therefore be accepted beyond plan limits or returned as successful without a durable chained audit event. Template generation uploaded the storage object before creating metadata and did not remove the object when downstream metadata or audit persistence failed.

The separate HTTP upload route already enforced quota, fail-closed throttling and audit compensation. Server actions remain independently callable and must enforce the same invariants.

## Decision

- Apply request-actor and organization-scoped distributed limits to direct creation, generated creation and upload with the upload policy and explicit `failureMode: 'fail-closed'`.
- Verify the document quota server-side before validation, malware scanning, template rendering or storage mutation; generated creation revalidates the same controls before metadata persistence.
- Select an explicit mutation column allowlist.
- Require the chained audit writer to return `persisted: true`; otherwise delete the exact inserted tenant/user/storage row and return failure.
- Treat audit-writer exceptions exactly like negative persistence results.
- Remove a newly uploaded template object whenever metadata creation or its required audit fails.
- Report compensation failures with bounded identifiers and never log the raw storage path.

## Consequences

- Redis or quota-check unavailability blocks document mutations instead of silently bypassing a control.
- Direct and generated documents consume the same tenant quota as multipart uploads.
- A successful server-action response implies both metadata and durable chained audit persistence.
- Cross-system compensation remains best effort; a failed compensation is reported and the caller still receives failure.

## Evidence boundary

Repository tests prove call order, denial behavior and compensation contracts. They do not prove live Upstash sharing, production Supabase writes, storage deletion, RLS or malware-provider behavior.

## Rollback

Revert the action, tests and ADR together through a reviewed PR. Weakening quota, audit or fail-closed behavior requires explicit security and billing risk acceptance.
