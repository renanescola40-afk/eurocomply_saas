# Auth redirect base URLs

Auth and OAuth redirects must not derive their production base URL from the incoming request origin or Host header.

## Required contract

- Production redirects must use a configured application base URL.
- The configured base URL must parse as an HTTP(S) URL.
- When the configured base URL is unavailable in production, auth flows must fail closed with a public, no-store error response.
- Development and test may fall back to the request origin for local ergonomics.
- `next` parameters remain path-only and dashboard-scoped.

## Helper

`src/server/security/auth-callback.ts` exposes `resolveAuthAppBaseUrl()` for this contract.

The helper is covered by `src/server/security/auth-callback.test.ts`, including:

- configured app origin wins over request origin;
- invalid or missing app URL fails closed in production;
- request-origin fallback is limited to non-production environments.

## Follow-up hardening

`/auth/google` and `/auth/callback` should use `resolveAuthAppBaseUrl()` for all login, callback and post-auth redirects. This prevents Host/header influenced redirect bases in production while preserving local development behavior.
