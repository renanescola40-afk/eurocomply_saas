# ADR: Require POST for intelligence refresh mutations

- Date: 2026-07-17
- Status: Proposed
- Priority: P1
- Scope: Internal intelligence refresh API method semantics

## Context

`/api/intelligence/refresh` performs a privileged upsert into `intelligence_items` and can publish the internal maintenance record. The route previously exported a `GET` handler that directly delegated to `POST`, so an authenticated GET request could mutate persisted content.

Authentication and rate limiting reduce exposure, but they do not make GET an appropriate mutation method. GET requests may be retried, prefetched, cached, inspected, or invoked by infrastructure under assumptions that they are safe and idempotent. Allowing a state-changing operation through GET also makes operational reviews and automated endpoint controls less reliable.

## Decision

Keep the existing authenticated, rate-limited mutation on `POST` only.

The `GET` handler now returns:

- HTTP `405 Method Not Allowed`;
- `Allow: POST`;
- the stable error code `method_not_allowed`;
- existing no-store response headers.

The database upsert, internal authentication, rate limiting, payload, and publication behavior on valid POST requests remain unchanged.

## Consequences

Positive consequences:

- GET no longer changes persisted intelligence content;
- clients and operators receive an explicit method contract;
- prefetching, retries, probes, and safe-method assumptions cannot trigger the mutation;
- the change is isolated and does not alter database schema, RLS, RBAC, secrets, dependencies, or content rules.

Trade-offs:

- any scheduler or operator incorrectly invoking this endpoint with GET must switch to POST;
- this change does not validate the legal accuracy, freshness, provenance, or publication status of intelligence content;
- this change does not prove production scheduler configuration or runtime availability.

## Verification

A focused regression contract verifies that:

- GET does not delegate to POST;
- GET returns a no-store 405 response with `Allow: POST`;
- POST retains internal authentication, rate limiting, and the upsert mutation.

Required repository CI, security, and release checks must run against the exact pull-request head SHA before merge readiness can be considered.

## Evidence boundary

Evidence is limited to repository source, the pull-request diff, the regression contract, this decision record, and exact-head GitHub Actions results. No runtime execution, production scheduler validation, external audit, penetration test, or legal review is claimed.

## Rollback

Revert the commits in the pull request. Reversion restores state-changing GET behavior and should require an explicit security and API-governance decision. No database or provider rollback is required.
