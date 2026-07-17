# Fail closed when compliance-task update auditing is unavailable

- Status: Accepted for review
- Date: 2026-07-17
- Scope: `updateComplianceTask`

## Context

Compliance tasks are governance records used to assign, prioritize, and track remediation work. The update action committed task state and then called the chained audit writer, but did not inspect its explicit `persisted` result. A database, schema, privileged-client, provider, or audit-chain failure could therefore leave a governance-significant state change active while the caller received a successful result without durable accountability evidence.

## Decision

A compliance-task update is reported as successful only when its audit event is durably persisted.

Before mutation, the action reads the current tenant-scoped task. If audit persistence fails after the update, the action attempts to restore the previous task values. The compensation is constrained by task ID, organization ID, and the `updated_at` value returned by the current mutation. This compare-and-set condition avoids overwriting a later concurrent update.

The action then returns the existing generic update failure. Compensation failure is reported through sanitized observability and is not represented as a successful operation.

## Consequences

- Governance task updates fail closed when durable audit evidence is unavailable.
- Audit-store outages can reduce task-update availability.
- One additional tenant-scoped read is performed before each update.
- Compensation is best effort; a concurrent later mutation is preserved rather than overwritten.
- Task creation and deletion remain separate decisions and are not broadened by this change.

## Evidence boundary

This decision and its source-contract test demonstrate intended repository behavior only. They do not claim production database availability, runtime audit persistence, penetration testing, certification, or successful deployment.

## Rollback

Revert the commits in this pull request. That restores the previous behavior where task updates could succeed independently of audit persistence. No schema, migration, secret, dependency, or external API rollback is required.
