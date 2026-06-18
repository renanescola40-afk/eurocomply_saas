# Route entrypoint boundaries

Last updated: 2026-06-18

EuroComply route handlers must live under `src/app/**` so the App Router, middleware, and security gates classify them consistently.

## Policy

- Do not add route handlers under parallel source trees such as legacy API folders, Pages Router API folders, or integration-specific proxy folders.
- Private and mutable SaaS APIs belong under `src/app/api/**` and must pass the enterprise API guard pipeline.
- Public authentication routes belong under `src/app/auth/**` and must use public error codes plus no-store redirects.
- Any route handler outside `src/app/**` is treated as an unclassified legacy entrypoint and must be removed or migrated before merge.
- Legacy API directory trees must not remain in `src/**` after migration, even if they do not currently contain a route handler.

## Why this matters

Duplicate or legacy route trees can bypass the security classification used by `security:enterprise-api`. That creates drift: one route can keep older authentication, tenant, rate-limit, no-store, URL, or error-handling behavior while the canonical route is hardened.

This is especially risky for payment, webhook, file, proxy, and internal-job paths because a parallel implementation can keep stale auth or provider behavior while the hardened App Router endpoint looks correct.

## CI enforcement

`npm run security:enterprise-api` delegates to `scripts/security/check-route-entrypoints.mjs`. The gate scans `src/**/route.{ts,tsx,js,jsx}` and fails if any route entrypoint is outside `src/app/**`. It also fails when known legacy API directory trees still exist with entries under `src/**`.

Before adding a new route, migrate it into `src/app/api/**` or `src/app/auth/**` and make the relevant existing security gate classify it explicitly.
