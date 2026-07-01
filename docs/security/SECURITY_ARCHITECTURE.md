# Security Architecture

This document captures the production security architecture for the multi-tenant SaaS.

## Security goals

- Prevent cross-tenant access across pages, APIs, server actions, exports and downloads.
- Prevent administrative actions without the required organization permission.
- Keep privileged credentials out of client bundles.
- Return no-store responses from sensitive APIs and private downloads.
- Apply origin validation, rate limiting and bounded validation to mutations.
- Use sanitized logging and generic external errors.

## Request flow

1. User authenticates through the configured auth provider.
2. Middleware protects private routes and keeps public auth redirects constrained to safe locale-aware paths.
3. Server routes resolve the current user server-side.
4. APIs and server actions resolve the organization context server-side.
5. RBAC checks verify organization membership and the required permission.
6. Resource-level checks verify that the target object belongs to the authorized organization.
7. Sensitive responses use `Cache-Control: no-store`.
8. Sensitive failures and mutations are audit logged where supported.

## Canonical security modules

| Module | Purpose |
| --- | --- |
| `src/lib/security/permissions.ts` | Canonical enterprise RBAC matrix and role normalization. |
| `src/server/security/rbac.ts` | Server-side organization membership and permission enforcement. |
| `src/server/security/api-guards.ts` | Reusable API guard helpers for auth, tenant, permission, rate limit, trusted origin, no-store and resource ownership. |
| `src/server/security/origin-guard.ts` | Trusted origin validation for browser-triggered mutations. |
| `src/server/security/no-store.ts` | No-store JSON/download response helpers. |
| `src/lib/security/validate.ts` | Bounded JSON parsing and validation helpers. |
| `src/lib/security/rate-limit.ts` | Distributed rate limiting with route/user/organization/action subjects. |

## API requirements

Private APIs must use the following sequence unless they are explicitly public health/readiness endpoints:

1. `requireApiUser()` or equivalent server-side user resolution.
2. `requireOrganizationAccess()` or `requirePermission()` for tenant-scoped data.
3. `requireTrustedMutation()` for POST/PUT/PATCH/DELETE browser mutations.
4. `parseJsonBodyWithZod()` for JSON input.
5. `assertApiResourceOrganization()` or equivalent resource ownership check for resource IDs.
6. `secureApiJson()`, `noStoreJson()` or `noStoreDownload()` for sensitive responses.
7. `secureApiError()` for sanitized failures.

## Server action requirements

Server actions must validate:

- Authenticated user.
- Organization membership.
- Permission for the action.
- Input with Zod or an equivalent schema.
- Resource ownership for updates, deletes, exports and downloads.
- Audit log for billing, team, settings, exports, incident and destructive operations.

## Public endpoints

Health and readiness endpoints may be public only when they do not expose secrets, internal dependency details, database identifiers, stack traces or environment values. Their responses should remain operationally useful but safe for external callers.

## Client boundary

Client components may import display-only constants and safe helpers, but must not import server-only modules, privileged database clients, secrets, webhook code, billing secret logic or direct tenant authorization code that relies on trusted backend credentials.

## Evidence and tests

The security model is validated through unit/security tests for RBAC, API guards, no-store responses, origin guards, protected routes, BOLA/IDOR checks, upload hardening, CSV export hardening and tenant isolation evidence scripts.
