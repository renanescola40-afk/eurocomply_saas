# Fail closed when team-role audit persistence is unavailable

- **Date:** 2026-07-17
- **Status:** Proposed
- **Decision scope:** Organization member role changes
- **Priority:** P1 security and audit integrity

## Context

The team member role endpoint performs privileged authorization changes through the atomic `change_organization_member_role_atomic` database function. After a successful transition, it writes a chained `team_member_role_changed` audit event.

The endpoint previously returned HTTP 200 even when the audit writer explicitly reported `persisted: false`. The response exposed that failure as metadata, but the role change remained applied. This allowed a governance-significant authorization change to exist without durable accountability evidence.

## Decision

A changed role is not reported as successful unless the corresponding audit event is durably persisted.

When audit persistence fails, the endpoint:

1. attempts an atomic compare-and-set reversal using the same role-transition RPC;
2. requires the currently applied role to match the role set by this request before reversing it;
3. reports only sanitized operational context if compensation fails; and
4. returns a no-store HTTP 503 response with `team_role_change_audit_unavailable`.

The endpoint returns `auditPersisted: true` only after the audit guard succeeds.

## Motivation

Role assignment controls access to organization data and privileged product operations. Treating an authorization mutation as successful without durable evidence weakens incident reconstruction, access reviews, customer assurance, and internal accountability.

The compare-and-set rollback avoids blindly overwriting a later concurrent role change.

## Impact

- Privileged role changes fail closed when audit storage is unavailable.
- A temporary audit outage can reduce team-administration availability.
- Successful role changes retain their existing response shape, except that `auditPersisted` is now always `true` on success.
- Existing authentication, tenant scoping, permission checks, trusted-mutation validation, rate limiting, step-up authentication, self-change restrictions, and last-owner protection remain unchanged.

## Risks

- Compensation can fail because of a concurrent transition or database outage. The endpoint reports this through sanitized observability and still returns 503 rather than claiming success.
- Reversing an owner transition reuses the existing atomic last-owner safeguards; no direct table update bypass is introduced.
- This decision does not prove runtime audit availability or the effectiveness of production alerting.

## Tests and evidence

A security contract test verifies that:

- successful responses occur only after `audit.persisted` is true;
- audit failure returns 503;
- compensation uses the atomic role-transition RPC with the applied role as the expected state; and
- tenant, permission, trusted-mutation, rate-limit, step-up, and last-owner controls remain present.

Repository CI and security checks must pass on the exact pull-request head before merge. No runtime audit, penetration test, or production evidence is claimed by this decision record.

## Rollback

Revert the pull-request commits. This restores the previous behavior where role changes remain successful even if audit persistence fails. No schema, migration, secret, dependency, or external-service rollback is required.
