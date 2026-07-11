# RISCK COMPLY Enterprise Architecture

Status: repository-side architecture baseline. This document does not constitute production or compliance certification.

## Primary stack and identity

- Next.js 15 / React 19 / TypeScript.
- Supabase Auth is the sole primary identity provider for login, signup, onboarding, dashboard, server queries, API authorization and RLS identity.
- Supabase Postgres is the system of record for tenant data.
- Stripe handles billing; Vercel hosts the application; Sentry handles error monitoring.
- Clerk must not be introduced into critical authentication flows while Supabase Auth remains primary.

## Trust boundaries

1. Browser: untrusted input and presentation only. Client-side role checks are UX hints, never authorization.
2. Next.js server boundary: validates session, tenant membership, permission, origin, payload size/schema, rate limit and action-specific invariants.
3. Supabase/Postgres boundary: RLS is mandatory defense-in-depth for tenant-scoped tables.
4. External providers: Stripe, Sentry, email, analytics and upload scanner are treated as independent failure domains.

## Required request pipeline for sensitive mutations

1. Generate/propagate requestId.
2. Authenticate with Supabase server session.
3. Resolve active organization from trusted server data.
4. Validate membership and server-side RBAC/ABAC.
5. Apply origin/CSRF guard where browser credentials are accepted.
6. Apply rate limit by action and, where available, IP + user + organization.
7. Read bounded input and validate with Zod.
8. Execute tenant-scoped query with explicit organization_id.
9. Write sanitized audit event for security-relevant actions.
10. Return sanitized no-store response.

## Authorization model

Canonical roles: owner, admin, editor, member, viewer. Permissions should be mapped centrally to actions rather than scattered role-name comparisons. Owner-only or step-up actions include organization deletion, ownership transfer, high-risk billing changes, bulk export and account/data deletion.

Every tenant-scoped read/write must satisfy both:

- application authorization: authenticated membership plus permission;
- database authorization: RLS using the authenticated identity and tenant relationship.

## Failure behavior

- Authentication failure: 401.
- Authenticated but insufficient permission or no membership: 403.
- Cross-tenant resource lookup should not disclose existence; use 404 where appropriate after authorization context is established.
- Invalid input: 400/422 with stable public error codes.
- Dependency unavailable: sanitized 503, requestId, no stack trace.
- High-risk controls fail closed.

## Caching and data exposure

Private pages and sensitive APIs must set `Cache-Control: private, no-store, max-age=0` or stricter. Logs, Sentry events and audit logs must exclude access tokens, cookies, authorization headers, raw webhook secrets, full payment data, unnecessary PII and tenant document content.

## Deployment architecture

The release is evidence-driven. `npm run release:production-final` may produce Go only when quality, security, E2E, runtime smoke, observability, live RLS, rollback and governance evidence are complete for the exact promoted commit and target. Repository checks alone cannot establish Enterprise Go.

## Architecture decision records required before major change

Create an ADR for: replacing Supabase Auth; adding a second identity provider; changing tenant key strategy; bypassing RLS; introducing a queue; changing billing provider; changing upload scanning; or adding a new production data processor.
