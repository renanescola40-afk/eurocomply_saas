# Fail closed on compliance-task creation audit persistence

- Status: Proposed
- Date: 2026-07-17
- Scope: `createComplianceTask`

## Context

Compliance tasks are organization-scoped governance records used to assign and track remediation work. The creation action inserted the task and then emitted `task.create`, but it did not inspect the audit writer's explicit `persisted` result. An audit-chain, database, schema, provider, or privileged-client failure could therefore leave a task committed while the caller received a successful result without durable accountability evidence.

## Decision

Task creation must not be reported as successful unless the corresponding durable audit event is persisted.

After inserting the task, the action checks `audit.persisted`. When persistence is unavailable, it attempts a compensating delete constrained by both the newly created task ID and the organization ID, reports any rollback failure through sanitized observability, and returns the existing stable creation error. The action never weakens authentication, permission checks, tenant scoping, validation, or distributed rate limiting.

## Consequences

- Governance task creation fails closed when durable audit storage is unavailable.
- A short audit outage can reduce task-creation availability.
- Update and deletion audit semantics are outside this narrowly scoped change and require separate review before any modification.

## Risks and trade-offs

- The compensating delete is best effort rather than an atomic transaction with audit persistence.
- If compensation also fails, the task may remain stored without its durable creation event and operators must investigate the sanitized rollback error.
- A concurrent change after insertion could complicate manual remediation; runtime evidence is required before claiming compensation safety under concurrency.
- Requiring durable audit persistence intentionally favors accountability over task-creation availability during an audit-store outage.

## Evidence boundary

The source change and regression contract demonstrate intended control flow only. They do not prove production database connectivity, runtime audit persistence, rollback execution, tenant isolation, or external audit compliance. No runtime evidence, penetration test, certification, or legal conclusion is claimed.

## Rollback

Revert the action change, regression test, and this decision record. Reverting restores the prior availability behavior but also restores the risk of successful unaudited task creation.
