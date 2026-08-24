# Current Production provider runtime revalidation — `41cc6656`

**Observed:** 2026-08-24 22:10 UTC  
**Purpose:** redacted attributable runtime fact retention for External Assurance review.  
**Authority boundary:** direct runtime evidence only; this is **not** protected Provider Runtime acceptance, legal/DPA acceptance, Sentry release/source-map producer acceptance, pentest evidence or Production GO.

## Exact subject

- protected `main`: `41cc6656de9a9d9df06b549dc1309d481498758b`
- Vercel Production deployment: `dpl_FEUDn9oPpzetNwZcu3N5qJWmeAtZ`
- deployment state/target: `READY / production`
- canonical origin: `https://www.risckcomply.com`

## Redacted observations

### Upstash-backed billing limiter path

`GET /api/billing/catalog` returned HTTP `200` from current Production with `cache-control: no-store` and an attributable request ID. The route is the canonical billing catalogue route and traverses the Production fail-closed billing Redis rate limiter before returning the normal catalogue response. This establishes current direct runtime binding for the Redis-backed path; it does not establish Upstash account owner/plan/region/retention/DPA/transfer facts or protected provider acceptance.

### Sentry public release binding

`GET /pt/trust` returned HTTP `200` on the same deployment and exposed redacted public tracing metadata containing:

- `sentry-environment=production`
- `sentry-release=41cc6656de9a9d9df06b549dc1309d481498758b`

The automatic Vercel build for this deployment also recorded `No auth token provided. Will not create release.` / source-map upload warnings. Therefore current public runtime binding is proven, while the governed protected Sentry release/source-map producer remains **OPEN**.

### Public runtime baseline

Fresh direct checks on the same exact release also showed:

- `/api/health` -> HTTP `200`
- anonymous `/api/ready` -> HTTP `401` fail-closed
- recent deployment-scoped runtime-error inspection -> no error/fatal events observed in the inspected window

## Evidence classification

`CURRENT_DIRECT_RUNTIME_BINDING: PROVEN_41cc6656`

`UPSTASH_CURRENT_DIRECT_RUNTIME: PROVEN`

`SENTRY_CURRENT_PUBLIC_RELEASE_BINDING: PROVEN`

`SENTRY_PROTECTED_RELEASE_SOURCE_MAP_PRODUCER: OPEN`

`PROTECTED_PROVIDER_RUNTIME_ACCEPTANCE: OPEN`

`ACCOUNT_LEGAL_FACTS: OPEN_WHERE_NOT_INDEPENDENTLY_PROVEN`

No credentials, cookies, tokens, API keys, user-level identity data, full response payloads or private contracts are retained here.
