# Authenticate team invite mutations before payload validation

- Date: 2026-07-14
- Status: Accepted
- Priority: P1 security boundary hardening

## Context

`POST /api/team/invites` parsed and validated the request body before authenticating the caller. As a result, an unauthenticated request containing an invalid payload received `400 invalid_invite_payload` instead of the route's authentication failure. The route inventory requires authenticated/admin mutation endpoints to establish their access boundary before processing attacker-controlled mutation input.

The body was already bounded to 4 KiB, so this was not an unbounded-memory issue. The concrete gap was guard ordering and response semantics: unauthenticated callers could exercise the parser and distinguish payload validity before authentication, while origin/rate-limit and step-up controls had not yet run.

## Decision

Run the existing controls in this order:

1. authenticate the API user;
2. resolve the active organization;
3. require `manage_team` permission;
4. enforce trusted origin and distributed rate limiting;
5. require step-up authentication;
6. read the bounded JSON body and validate the invite payload;
7. evaluate entitlements and perform the mutation.

No control is removed or relaxed. The 4 KiB body bound, schema, RBAC, step-up, rate limit, origin check, audit event, notification, and entitlement checks remain unchanged.

## Impact

- unauthenticated malformed requests now receive the authentication response instead of a payload-validation response;
- denied RBAC, origin/rate-limit, or step-up requests do not parse the invite body;
- authenticated and authorized callers still receive `400 invalid_invite_payload` for invalid input;
- valid invite behavior and response shape are unchanged.

## Risks and trade-offs

The route now performs authentication and authorization lookups before returning a validation error. This is intentional for a protected administrative mutation and aligns the route with the documented security boundary. No database schema, provider, dependency, secret, plan, or public API contract changes are introduced.

## Tests

Focused tests prove that:

- authentication failure wins over malformed payload validation;
- invalid payloads are rejected only after auth, RBAC, trusted-mutation, and step-up gates pass;
- entitlement and write calls are not reached for invalid payloads;
- existing permission, rate-limit, step-up, audit, and successful invite behavior remain covered.

## Evidence boundary

This decision records repository implementation and CI-test intent only. It does not claim production deployment, runtime penetration testing, external audit, or provider validation.

## Rollback

Revert this change. The route will return to parsing bounded invite payloads before authentication. No migration, data repair, provider rollback, or credential rotation is required.
