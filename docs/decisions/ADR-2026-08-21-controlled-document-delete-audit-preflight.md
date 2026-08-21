# ADR: Controlled document deletion requires durable audit preflight

- Status: Accepted
- Date: 2026-08-21
- Scope: controlled-document deletion server action

## Context

`deleteDocument` removed the tenant-scoped Storage object and database metadata
before appending `document.deleted`. The audit writer returns an explicit
`persisted` result, but the action ignored it. An audit-chain outage could
therefore produce an irreversible deletion with no durable application evidence
and still return success.

Storage and Postgres cannot participate in one transaction in the current
architecture. A compensating upload after deletion would not be reliable and
could restore bytes without faithfully restoring metadata or provider state.

## Decision

Before the first destructive mutation, the action must persist a
`document.delete_authorized` event containing only bounded metadata. If that
preflight is not durable, the action fails closed and performs no deletion.

After Storage and metadata deletion, the action must persist
`document.deleted`. If completion evidence is unavailable, the action reports a
sanitized temporary failure and never reports success. The durable authorization
event still proves who initiated the destructive operation and which tenant and
document were in scope.

## Consequences

### Risks and trade-offs

- Audit availability becomes a dependency of controlled-document deletion.
- A completion-audit outage after provider/database mutation can make a retry
  observe `not found`, but it cannot leave the deletion wholly unaudited.
- No customer data, document name, storage path, token or file contents are added
  to audit metadata.
- This is repository behavior only; production audit-chain and deletion runtime
  evidence remain separately required.

## Rollback

Revert the action, regression test and this ADR together. Reverting restores the
prior availability behavior but also restores the risk of unaudited deletion.
