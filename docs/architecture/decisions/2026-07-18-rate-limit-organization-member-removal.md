# Rate-limit organization member removal

Date: 2026-07-18
Status: Proposed
Priority: P1

## Context

`removeOrganizationMember` is a privileged, destructive tenant mutation. It already requires authentication, tenant-scoped `team:remove` authorization, blocks self-removal, and delegates last-owner and stale-state protection to an atomic database RPC.

The action did not apply a distributed abuse-control boundary before member lookup and RPC execution. A compromised privileged session, malfunctioning client, or scripted caller could repeatedly exercise authorization, database lookup, row locking, RPC, audit, and observability capacity.

## Decision

Apply the existing distributed `team-management` rate-limit policy before loading the target member or invoking the removal RPC.

The limiter:

- is keyed by organization and actor;
- is limited to 10 attempts per minute;
- uses `failureMode: 'fail-closed'`;
- identifies the route as `server-action:team.member_remove`;
- rejects denied attempts before database lookup and mutation.

Existing authorization, tenant scoping, self-removal protection, atomic last-owner enforcement, optimistic state checks, and audit behavior remain unchanged.

## Impact

This bounds repeated destructive team-management attempts and reduces avoidable database and audit pressure. Normal administrative use should remain well below the selected threshold.

## Risks and trade-offs

A legitimate administrator performing more than 10 removals in one minute will receive a temporary generic error. A distributed rate-limit provider outage also blocks removal by design. This availability trade-off is intentional for a privileged destructive action.

The per-actor and per-organization key limits repeated attempts from one privileged identity, but it does not eliminate coordinated abuse across multiple authorized identities. Production confidence still depends on provider availability, alerting, and environment-backed abuse testing.

## Evidence boundaries

This decision is based on repository source review. It does not claim production deployment, runtime provider validation, penetration testing, or live abuse testing. Those require exact-head CI and environment-backed validation.

## Validation

A focused source-level Vitest regression asserts that the existing distributed policy is configured fail closed and runs before member lookup and the atomic removal RPC. Required repository checks must be green on the exact PR head before merge.

## Rollback

Revert the commits in the pull request. No migration, dependency, environment-variable, or data rollback is required.
