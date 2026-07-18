# Rate-limit organization invitation cancellation

Date: 2026-07-18
Status: Proposed
Priority: P1

## Context

`cancelOrganizationInvitation` revokes a pending organization invitation and its associated access token lifecycle. The action already requires authentication, tenant-scoped `team:remove` authorization, verifies that the invitation belongs to the organization, and deletes only invitations that remain unaccepted.

The action did not apply a distributed abuse-control boundary before invitation lookup and deletion. A compromised privileged session, malfunctioning client, or scripted caller could repeatedly exercise authorization, database lookup, deletion, audit, and observability capacity across invitation identifiers.

## Decision

Apply the existing distributed `team-management` rate-limit policy before loading or deleting the invitation.

The limiter:

- is keyed by organization and actor;
- permits 20 attempts per minute;
- uses `failureMode: 'fail-closed'`;
- identifies the route as `server-action:team.invite_cancel`;
- rejects denied attempts before database lookup and mutation.

Existing authentication, authorization, tenant scoping, pending-state checks, optimistic deletion condition, and audit behavior remain unchanged.

## Impact

This bounds repeated privileged invitation-revocation attempts and reduces avoidable database and audit pressure. Normal administrative use should remain below the selected threshold while still allowing batch cleanup of stale invitations.

## Risks and trade-offs

A legitimate administrator cancelling more than 20 invitations in one minute will receive a temporary generic error. A distributed rate-limit provider outage also blocks cancellation by design. This availability trade-off is intentional for a privileged access-control mutation.

The organization-and-actor key limits repeated attempts from one privileged identity but does not eliminate coordinated abuse across multiple authorized identities. Runtime confidence still depends on provider availability, alerting, and environment-backed abuse validation.

## Evidence boundaries

This decision is based on repository source review. It does not claim production deployment, runtime provider validation, penetration testing, or live abuse testing. Those require exact-head CI and environment-backed validation.

## Validation

A focused Vitest regression asserts that the existing distributed policy is configured fail closed and executes before invitation lookup and deletion. All required repository checks must be green on the exact pull-request head before merge.

## Rollback

Revert the commits in the pull request. No migration, dependency, environment-variable, or data rollback is required.
