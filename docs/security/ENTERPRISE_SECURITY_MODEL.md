# EuroComply Enterprise Security Model

Last updated: 2026-06-18

This document defines the enterprise security baseline for EuroComply SaaS API routes, private pages and privileged server-side operations. The model is intentionally fail-closed: when a critical security dependency cannot be verified in production, the protected action must be blocked rather than allowed with degraded controls.

## Scope

The baseline applies to:

- `src/app/api/**/route.ts` API handlers;
- private App Router pages guarded by `proxy.ts`;
- server actions and server-only query helpers that read or mutate tenant data;
- service-role Supabase usage;
- export, billing, team, document, GDPR, audit, AI governance and internal cron endpoints.

## Threat model

The controls are designed to reduce risk from:

- unauthenticated access to private SaaS APIs;
- CSRF and cross-origin mutation attempts;
- BOLA/IDOR against dynamic resource IDs;
- cross-tenant data exposure from missing `organization_id` filters;
- viewer/member users attempting admin actions;
- brute force and API abuse;
- Redis/rate-limit outages that silently degrade protection;
- stack trace, secret or implementation-detail leakage;
- client-side service-role exposure;
- XSS, clickjacking, MIME sniffing, referrer leakage and over-broad browser permissions;
- SSRF through uncontrolled internal job, webhook, integration or proxy execution;
- open-proxy routes that forward caller-controlled headers while injecting server-side credentials.

## Request authorization pipeline

Every mutable SaaS API route must follow this order unless explicitly documented as a public verifier or signed webhook:

1. **Trusted origin validation** using `assertTrustedOrigin` or `requireEnterpriseApiAccess`.
2. **Authentication** using `getCurrentUser`, `requireCurrentUser` or the enterprise API helper.
3. **Organization context** using `getCurrentOrganizationForUser` or a stricter tenant resolver.
4. **RBAC** using `assertOrganizationPermission` or `requireEnterpriseApiAccess`.
5. **Tenant/resource ownership check** before using any dynamic ID or externally supplied resource ID.
6. **Distributed rate limit** using Upstash-backed `checkDistributedRateLimit` or an approved wrapper.
7. **Input validation and normalization** before database writes or downstream service calls.
8. **Auditing** for state-changing security, billing, export, document, team and governance events.
9. **No-store response headers** through `noStoreJson`, `noStoreDownload` or `applyNoStoreHeaders`.
10. **Sanitized errors and logs**: no stack traces, raw exception payloads, bearer tokens, cookies, service keys or provider secrets in client responses or logs.

Routes may return `404 resource_not_found` for tenant mismatch to avoid resource enumeration. Do not reveal whether a resource exists in another organization.

## BOLA/IDOR and tenant isolation

Tenant isolation is mandatory at every layer:

- every tenant-scoped table query must filter by `organization_id` derived from the authenticated membership context, not from untrusted request input;
- dynamic routes such as `[id]` must confirm the resource belongs to the current organization before read/update/delete/approval/export;
- failed cross-tenant lookups must be treated as not found;
- server actions must use the same membership and permission checks as API routes;
- Supabase RLS remains required, but application-level tenant checks are still mandatory for admin/service-role code.

## Service-role containment

`SUPABASE_SERVICE_ROLE_KEY` may only be used by server-only modules. The service-role client is centralized in `src/lib/supabase/admin.ts`, which imports `server-only` to prevent client bundling.

Client components and browser bundles must never import:

- `@/lib/supabase/admin`;
- `createAdminClient`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- any `NEXT_PUBLIC_*SERVICE_ROLE*` variable.

## Rate limiting and fail-closed behavior

Production rate limiting uses Upstash Redis via:

- `UPSTASH_REDIS_REST_URL`;
- `UPSTASH_REDIS_REST_TOKEN`.

For sensitive production actions:

- missing Upstash configuration returns a blocking security failure;
- Upstash non-OK responses return a blocking security failure;
- Upstash timeouts or network exceptions return a blocking security failure;
- local in-memory fallback is allowed only for development and tests.

Sensitive rate-limit failures should return `503 security_control_unavailable`. Quota exhaustion should return `429 rate_limit_exceeded` with `Retry-After` and rate-limit headers.

## Origin and CSRF policy

Mutable requests must include a trusted `Origin` or a trusted `Referer`. Production requests with missing, invalid or untrusted origins are blocked. Trusted origins come from:

- `NEXT_PUBLIC_APP_URL`;
- `TRUSTED_ORIGINS` as a comma-separated list.

Safe methods (`GET`, `HEAD`, `OPTIONS`) may bypass origin validation, but sensitive GET downloads and verifiers still require no-store and rate limiting.

## SSRF and open-proxy policy

EuroComply must not expose generic proxy routes, catch-all integration relays or user-controlled outbound fetches without explicit security review. Any server-side route that forwards requests to a third-party service must:

- derive the upstream host from a hard-coded allowlist or a server-controlled configuration value, never from user input;
- validate trusted origin and authenticate the user before forwarding mutable traffic;
- enforce organization context and RBAC when tenant data or paid integrations are involved;
- use distributed rate limiting and no-store responses;
- construct outbound headers from an explicit allowlist instead of copying `request.headers` wholesale;
- never combine caller-controlled headers with server-side credentials or service keys;
- avoid catch-all `[...path]` routes unless each forwarded path is allowlisted.

`npm run security:no-open-proxy` scans route handlers for proxy/catch-all SSRF regressions and is part of `security:ci`.

## Security headers

The app must keep defense-in-depth headers active globally:

- `Content-Security-Policy` with `default-src 'self'`, `object-src 'none'`, `base-uri 'self'` and `frame-ancestors 'none'`;
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` denying high-risk browser capabilities by default;
- `X-Content-Type-Options: nosniff`.

Production CSP must not include `unsafe-eval`. Frame ancestors remain denied to prevent clickjacking.

## Public endpoint exceptions

Only these endpoint classes may skip user authentication/RBAC:

- signed Stripe webhooks that verify `STRIPE_WEBHOOK_SECRET` and Stripe signatures;
- public evidence-pack integrity verifiers that perform rate limiting, no-store and cryptographic verification;
- internal cron/ops endpoints authenticated with internal secrets or healthcheck tokens.

Exceptions must be covered by CI guard scripts and documented in code comments when non-obvious.

## CI gates

Run the full security gate before merging security-sensitive changes:

```bash
npm run security:ci
```

The enterprise gate includes:

```bash
npm run security:enterprise-api
npm run security:api-guards
npm run security:no-store
npm run security:origin-guards
npm run security:no-open-proxy
npm run security:authorization-bola
npm run security:client-boundaries
npm run security:headers
npm run security:logs
npm run security:responses
```

A PR must fail if a sensitive mutable route lacks authentication, organization context, RBAC, trusted-origin validation, tenant/resource checks, no-store responses or required rate limiting.

### Preflight profiles

There are two separate preflight profiles:

- **Production/deployment**: `npm run preflight` must run with real production secrets and variables. Missing Supabase, Stripe, internal signing or Upstash configuration must block deployment until operators fix the environment.
- **Security CI**: `.github/workflows/security-ci.yml` runs `node scripts/preflight-ci.mjs`, which injects non-secret placeholder values before delegating to `scripts/preflight.mjs`. This keeps repository/file/format checks active in pull requests without requiring production secrets to be exposed to PR jobs.

The CI placeholder profile must never be used by production deployment workflows. The production workflow remains required to call `npm run preflight` directly.

## Implementation checklist for new APIs

Before adding a new API route, verify:

- [ ] route is classified as private, public verifier, signed webhook or internal cron/ops;
- [ ] mutable private route checks trusted origin first;
- [ ] route authenticates a real Supabase user;
- [ ] route resolves organization from authenticated membership;
- [ ] route enforces the smallest required RBAC permission;
- [ ] every dynamic resource ID is checked against `organization_id`;
- [ ] sensitive route uses distributed rate limiting;
- [ ] route returns no-store headers on every response path;
- [ ] outbound fetches use allowlisted hosts, explicit headers and no generic catch-all proxying;
- [ ] errors are sanitized and do not expose stack traces, SQL, provider payloads or secrets;
- [ ] logs use stable event names and metadata without tokens, cookies, passwords or service keys;
- [ ] service role is used only through server-only helpers.

## Operational notes

Treat security dependencies as production-critical configuration. If `TRUSTED_ORIGINS`, Supabase admin credentials, webhook secrets, internal cron secrets or Upstash Redis are missing in production, the safest behavior is to block privileged actions and alert operators.
