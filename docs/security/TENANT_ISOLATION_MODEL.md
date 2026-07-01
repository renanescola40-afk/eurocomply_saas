# Tenant Isolation Model

This SaaS is a B2B multi-tenant application. The security boundary is the organization. A user may only access data for an organization where they have an active membership and a role that grants the requested permission.

## Core invariant

No resource may be accessed, exported, updated or deleted by ID alone.

Every tenant-scoped operation must validate all of the following on the server:

1. Authenticated user/session exists.
2. Target `organization_id` is known and normalized server-side.
3. User has a membership row for that `organization_id`.
4. User role grants the required permission for the action.
5. The target resource belongs to the same `organization_id` before returning, mutating, exporting or deleting it.

## Server-side enforcement points

| Layer | Responsibility |
| --- | --- |
| Middleware | Block unauthenticated access to private pages and prevent unsafe public/private redirects. |
| Server auth queries | Resolve authenticated user identity. |
| `src/server/security/rbac.ts` | Verify organization membership and canonical role permission. |
| `src/server/security/api-guards.ts` | Provide reusable API guard helpers for user, tenant, permission, origin, rate limit, no-store and resource ownership checks. |
| Supabase RLS | Database-level isolation for tenant-scoped tables. |
| Route/server action code | Must call the guards before returning or mutating tenant data. |

## BOLA/IDOR policy

For every route or action accepting a resource ID:

- Fetch the resource with its `organization_id`.
- Verify the authenticated user belongs to that `organization_id`.
- Verify the permission required by the action.
- Compare the resource `organization_id` with the authorized organization context.
- Return `403` or a generic not-found style response for unauthorized access; never leak whether another tenant owns the resource.

## Exports and downloads

Exports are sensitive because they can aggregate data across many objects. Export APIs must require authenticated user context, verified organization membership, `export_data` permission, resource ownership checks for requested IDs, `Cache-Control: no-store`, sanitized filenames and hardened CSV or attachment output.

## Mutations

Create, update and delete operations must require trusted origin validation, user/organization/action-aware rate limiting, Zod validation with bounded JSON bodies, permission checks through the canonical RBAC matrix and audit logging for sensitive changes where applicable.

## Privileged database credentials

Privileged database credentials may be used only in server-only modules for controlled backend checks such as membership verification or webhook processing. They must never be imported into client components, browser bundles or shared client utilities.

## Logging and errors

Logs must not contain secrets, tokens, raw env values or sensitive request bodies. External responses should use generic error codes. Detailed internal errors must be logged only in sanitized form.
