# Rate-limit invitation acceptance before token consumption

- Date: 2026-07-19
- Status: Proposed
- Priority: P1

## Context

Invitation creation and cancellation use high-risk team controls, but authenticated invitation acceptance called the atomic database RPC without distributed throttling. An authenticated actor could submit many opaque tokens, repeatedly exercise the privileged RPC and create avoidable database load.

Server actions also lacked a shared adapter that audits blocked high-risk decisions and tells temporary rate-limit backend failure apart from actual client abuse.

## Decision

- Enforce the `team-management` policy before the invitation acceptance RPC.
- Scope the bucket to the authenticated user and stable action/route identifiers; never place the raw invitation token or email in the key or audit metadata.
- Use explicit fail-closed behavior with five attempts per ten minutes.
- Audit block decisions using sanitized policy metadata.
- Return distinct typed failures for `rate_limited` and `security_control_unavailable`.
- Keep the mutation blocked even if the secondary block audit cannot be persisted.

## Evidence boundary

Repository tests prove call ordering, token exclusion, error classification and audit behavior. They do not prove live Upstash sharing, production headers/IP extraction, runtime Supabase behavior or invitation membership quota enforcement.

## Rollback

Revert the action, helper, tests and ADR together through review. Removing fail-closed protection reopens token-guessing and RPC exhaustion risk and requires an explicit security decision.
