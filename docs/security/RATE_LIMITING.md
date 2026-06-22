# Enterprise rate limiting and abuse protection

EuroComply applies centralized server-side rate limiting from `src/server/security/rate-limit.ts` for sensitive API and server-action entrypoints. The control protects login/auth flows, billing, uploads, exports, step-up challenges, webhooks, internal health probes, and general API traffic.

## Runtime model

- Production uses Upstash Redis via `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Development and test use an in-memory bucket so local iteration and unit tests do not require Redis.
- High-risk production policies fail closed when Redis is missing or unavailable.
- Low-risk production policies fail open according to policy so health/read-only surfaces do not become an outage amplifier.

## Policies

| Category | Default limit | Window | Failure mode | Audit block |
| --- | ---: | ---: | --- | --- |
| `auth` | 5 | 15 minutes | fail closed | yes |
| `billing` | 10 | 1 minute | fail closed | yes |
| `upload` | 20 | 10 minutes | fail closed | yes |
| `export` | 5 | 10 minutes | fail closed | yes |
| `step-up` | 5 | 5 minutes | fail closed | yes |
| `webhook` | 120 | 1 minute | fail closed | yes |
| `health/internal` | 120 | 1 minute | fail open | no |
| `general-api` | 300 | 1 minute | fail open | no |

Route handlers can override `limit`, `windowMs`, or `failureMode` only when the route owner can justify the variance. High-risk routes should not override to `fail-open`.

## Key construction

Use `buildRateLimitKey(category, subject)` or `checkRateLimitPolicy(category, subject)` with these dimensions:

- `userId` when authenticated;
- `organizationId` when tenant context applies;
- hashed IP material when IP is available and safe to use;
- `action` for the security-sensitive operation;
- `route` for route-level isolation.

Raw IP addresses are never logged by the limiter. IP material is hashed with `RATE_LIMIT_IP_HASH_SALT`, falling back to `NEXTAUTH_SECRET`, `AUTH_SECRET`, or a development-only salt.

## Legacy compatibility

Existing call sites importing `checkDistributedRateLimit` from `src/lib/security/rate-limit.ts` remain supported. The compatibility layer infers a policy category from legacy keys such as `billing:*`, `documents:upload:*`, `step-up:*`, `*:export:*`, `webhook:*`, `health:*`, `password:*`, and `auth:*`. Unknown legacy keys default to the fail-closed `auth` policy rather than silently becoming low-risk API traffic.

New code should prefer category-aware calls with explicit `userId`, `organizationId`, `ip`, `action`, and `route` fields instead of opaque keys.

## Response contract

Blocked HTTP routes return either `429` for normal exhaustion or `503` when a fail-closed production dependency failure prevents safe enforcement. The response helper emits:

- `Retry-After`;
- `RateLimit-Limit`;
- `RateLimit-Remaining`;
- `RateLimit-Reset`.

`RateLimit-Reset` is emitted as seconds until reset to keep the response compatible with retry clients and avoid leaking internal wall-clock details.

## Audit events

`rateLimitResponse()` writes `security.rate_limit.blocked` audit events for policies marked `auditOnBlock`. Metadata includes category, failure mode, reason, remaining count, retry-after seconds, and `keyHash`. The audit event never stores the raw limiter key or raw IP address.

## Sensitive endpoint coverage

The enterprise API gate already checks mutating routes for a rate-limit token. The current coverage includes:

- `/api/billing/checkout` and billing server actions;
- billing/customer portal server action;
- document upload routes;
- CSV and evidence/governance export routes;
- step-up challenge route;
- password reset/auth endpoints through the `auth` policy;
- sensitive admin/team/document mutations via `requireTrustedMutation` rate limits;
- Stripe/billing webhooks through the `webhook` policy;
- health/internal probes through the `health/internal` policy.

## Validation

Run:

```bash
npm run test -- src/server/security/rate-limit.enterprise.test.ts src/lib/security/rate-limit.test.ts tests/unit/rate-limit.test.ts
npm run security:enterprise-api
```

The tests verify requests below the limit pass, requests over the limit block, high-risk production routes fail closed without Redis, low-risk routes degrade according to policy, tenant-scoped keys do not interfere with one another, legacy sensitive keys map to the intended enterprise policy, and raw IP addresses are not exposed in limiter keys.
