# EuroComply API Security Model

## Goal

Every `src/app/api/**/route.ts` handler must protect itself. Page middleware is not an API authorization boundary, so API routes are classified and guarded at the route entrypoint.

## Route classes

| Class | Expected use | Required controls |
| --- | --- | --- |
| `public safe` | Static metadata, public verification, non-sensitive public reads | Explicit allowlist, no secrets or tenant data, no-store when dynamic |
| `authenticated` | User-specific route without tenant data | `requireApiUser()`, no-store responses, sanitized errors |
| `tenant-scoped` | Any route reading or writing organization data | `requireApiUser()`, validated `organizationId`, `requireOrganizationAccess()` or `requirePermission()`, BOLA/IDOR guard on resource `organization_id` |
| `admin-only` | Billing, team management, settings, privileged org actions | Tenant-scoped controls plus admin/manage permission via `requirePermission()` |
| `high-risk action` | Export, upload, approval, delete, checkout, invite, destructive actions | Tenant-scoped/admin controls plus trusted mutation, rate limit, input validation, and audit event |
| `webhook` | Stripe or third-party signed callbacks | Signature/body verification, no user session dependency, no CSRF Origin requirement |
| `health/internal` | Readiness, health, cron/internal maintenance | Explicit allowlist; internal routes require platform secret or internal authorization |

## Central helpers

Use `@/server/security/api-guards` for new and migrated API routes:

- `requireApiUser()` — requires a valid Supabase user and throws a sanitized `ApiSecurityError` on anonymous access.
- `requireOrganizationAccess({ userId, organizationId })` — requires a non-empty organization id and active membership. This blocks cross-tenant access before resource operations.
- `requirePermission({ userId, organizationId, permission })` — wraps `assertOrganizationPermission` and maps RBAC failures into sanitized API errors.
- `requireTrustedMutation(request, { rateLimit })` — for POST/PUT/PATCH/DELETE routes. It enforces trusted Origin/Referer and distributed rate limiting; webhooks are exempt and must verify signatures instead.
- `secureApiError(error)` — converts expected auth, RBAC, validation, and unexpected failures into no-store JSON without stack traces, SQL errors, tokens, or PII.

## Required route pattern

Tenant-scoped mutable routes should follow this order:

1. Parse and validate route params/query/body with Zod or bounded request readers.
2. Call `requireApiUser()`.
3. Resolve and validate `organizationId` from trusted context or request input.
4. Call `requireOrganizationAccess()` or `requirePermission()`.
5. Call `requireTrustedMutation()` for mutating methods.
6. Query/update data with an `organization_id` predicate or `assertApiResourceOrganization()` after loading the resource.
7. Emit an audit event for high-risk actions.
8. Return via `noStoreJson()` and wrap unexpected failures with `secureApiError()`.

## BOLA/IDOR rule

A resource id is never sufficient authorization. Any query by `id` must also validate tenant ownership through one of these mechanisms:

- database predicate: `.eq('id', id).eq('organization_id', organizationId)`;
- explicit post-load assertion: `assertApiResourceOrganization(resource.organization_id, organizationId)`;
- service-layer function that proves equivalent tenant scoping.

## Mutation rule

Except for signed webhooks and explicit health/internal endpoints, all POST/PUT/PATCH/DELETE routes must enforce:

- trusted Origin or Referer in production;
- distributed rate limit with production fail-closed behavior;
- Zod or bounded input validation;
- sanitized no-store errors;
- audit event for high-risk business actions.

## CI enforcement

`npm run security:api-route-hardening` runs `scripts/security/check-api-route-hardening.mjs`. The check inventories every App Router API route, classifies it, and fails when sensitive routes miss auth, tenant/BOLA protection, mutation Origin/rate-limit/input validation, or high-risk audit coverage. The current PR wires it through `security:api-guards`, which is already part of `security:ci`; adding a dedicated `package.json` alias is still recommended for readability.

## Migration status in this PR

Migrated reference routes:

- `src/app/api/documents/[id]/approval/route.ts`
- `src/app/api/team/members/remove/route.ts`
- `src/app/api/team/invitations/cancel/route.ts`
- `src/app/api/team/members/role/route.ts`

Added security coverage:

- central helper unit tests for auth, tenant membership, RBAC, cross-tenant resource checks, Origin enforcement, Zod sanitization, and internal error sanitization;
- BOLA/IDOR tests for team member removal;
- BOLA/IDOR tests for team invitation cancellation;
- security contract test for team member role changes.

Known follow-up migration backlog:

- `src/app/api/team/invites/route.ts`
- `src/app/api/billing/checkout-intent/route.ts`
- `src/app/api/gdpr/delete-request/route.ts`
- `src/app/api/ai-systems/route.ts`
- remaining `src/app/api/**/route.ts` endpoints flagged by `npm run security:api-route-hardening`.

## Legitimate exceptions

- Webhooks must not call `requireApiUser()` because they authenticate with signatures and raw request bodies.
- Public safe routes must be explicitly allowlisted by path and must not expose tenant data.
- Health/internal routes must be explicitly recognized by the hardening check and should not return secrets, environment values, or stack traces.
