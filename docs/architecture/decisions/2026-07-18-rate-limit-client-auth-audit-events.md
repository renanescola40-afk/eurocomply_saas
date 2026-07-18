# Rate-limit client-originated authentication audit events

Date: 2026-07-18
Status: Proposed
Priority: P1 security / SRE

## Context

`auditClientAuthEvent` is a server action used to submit authentication telemetry. Successful-login and logout events require an authenticated user, but `auth.login_failure` intentionally accepts an unauthenticated caller so failed sign-in attempts can be recorded.

Before this change, every syntactically supported invocation could call `recordAuthAuditEvent` without an abuse-control boundary. A scripted caller could repeatedly submit login-failure events and consume audit database, chain, logging, and observability capacity. This does not establish that exploitation occurred; it is a source-code risk identified during repository review.

## Decision

Apply the existing `auth` distributed rate-limit policy before writing any client-originated authentication audit event.

- Use the authenticated user ID when a session exists.
- For unauthenticated login failures, include request IP and user-agent only as rate-limit inputs. The existing rate limiter hashes network identifiers when constructing its key.
- Do not add raw IP or user-agent values to audit metadata.
- Keep the policy fail closed when the distributed limiter is unavailable.
- Return `{ persisted: false, reason: 'rate_limited' }` instead of throwing, so telemetry protection does not alter the primary authentication result.

## Impact

The audit sink receives bounded client-originated authentication telemetry. Authentication itself remains owned by the existing auth flow; this action only reports whether the supplemental audit event was persisted.

A caller behind a heavily shared network may lose some supplemental client audit events after the policy limit is reached. Server/provider authentication records remain outside the scope of this change.

## Risks and limitations

- Rate limiting reduces, but does not eliminate, distributed abuse.
- Forwarded address headers depend on trusted hosting-proxy normalization.
- The existing `auth` policy is intentionally strict and fail closed; an unavailable limiter suppresses this supplemental audit event.
- No production traffic, penetration test, or external audit evidence is claimed.

## Validation

A source-level security regression test asserts that the action:

- invokes `checkDistributedRateLimit`;
- selects the `auth` policy and fail-closed behavior;
- stops before `recordAuthAuditEvent` when denied;
- derives request-scoped identifiers for anonymous failures;
- does not add raw network identifiers to audit metadata.

Required exact-head CI, typecheck, test, build, security, dependency, secret-scanning, enterprise, and release gates must pass before merge.

## Rollback

Revert the commits in this pull request. No database migration, data backfill, environment change, or runtime evidence mutation is introduced.
