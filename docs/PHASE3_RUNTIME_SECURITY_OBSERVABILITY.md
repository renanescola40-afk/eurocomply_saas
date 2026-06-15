# Phase 3 Runtime Security and Observability Guide

This guide defines the runtime security and observability contract for EuroComply SaaS production readiness.

## Scope

This document covers production runtime headers, browser/server observability, operational diagnostics, and safe error handling expectations.

It does not authorize template, UI, product copy, document template, or email template changes.

## Runtime security headers

Production runtime must keep these headers configured for all routes:

- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

The Content Security Policy must keep these protections:

- `default-src 'self'`
- `object-src 'none'`
- `base-uri 'self'`
- `frame-ancestors 'none'`
- Stripe frame/connect allowances only where required for billing.
- Supabase connect allowances only where required for data access.
- Sentry connect allowances only where required for observability.

## Production CSP caution

Development may allow tooling-specific behavior such as eval. Production must not require development-only looseness.

Before production release, confirm the production build does not expose secrets in HTML, JavaScript bundles, response headers, source maps, or logs.

## Observability contract

Production observability must support:

- Client error capture.
- Server error capture.
- Release/source-map upload only when `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` are set outside the repository.
- Sentry tunnel route kept away from public template or content paths.
- No customer secrets in event messages, breadcrumbs, request bodies, or tags.

## Operational diagnostics

Production diagnostics must be useful without exposing private data.

Required diagnostic expectations:

1. Failed readiness checks should produce a local report that is ignored by Git.
2. Health/readiness endpoints must be token-protected in production.
3. Cron or scheduled job routes must require `CRON_SECRET` or an equivalent internal secret.
4. Server-only service-role operations must never run in browser/client components.
5. Logs must avoid raw tokens, cookies, Stripe secrets, Supabase service-role keys, and customer documents.

## Safe error handling

Production errors must:

- Return generic public messages to users.
- Keep detailed diagnostics in server logs or Sentry.
- Avoid leaking stack traces to public responses.
- Avoid returning raw provider errors when they include secrets, SQL, object paths, or internal IDs.

## Runtime release checks

Before production promotion:

```bash
npm run phase3:runtime
npm run phase3:strict
```

The strict runner must include the runtime checker before Phase 3 is considered complete.

## Phase 3 completion note

Phase 3 runtime readiness is complete only when the checker validates headers, observability configuration, package dependencies, and the protected operational documentation without requiring template changes.
