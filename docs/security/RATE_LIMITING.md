# Enterprise rate limiting

Risck comply uses centralized server-side rate limiting for sensitive application routes.

## Runtime model

- Production uses the configured Redis provider.
- Development and test can use a local in-memory fallback.
- High-risk production policies are configured to stop safely when the shared limiter cannot be checked.
- Lower-risk policies are explicit and documented.

## Policies

| Policy | Default limit | Window | Notes |
| --- | ---: | ---: | --- |
| `auth` | 5 | 15 minutes | Authentication flows |
| `password-reset` | 3 | 1 hour | Password reset flows |
| `step-up-challenge` | 5 | 5 minutes | Step-up verification |
| `billing-checkout` | 10 | 1 minute | Checkout sessions |
| `billing-portal` | 10 | 1 minute | Billing portal sessions |
| `upload` | 20 | 10 minutes | Controlled uploads |
| `export` | 5 | 10 minutes | Export routes |
| `gdpr-delete` | 3 | 1 hour | GDPR delete workflow |
| `audit-chain-verify` | 10 | 1 hour | Audit verification |
| `webhook` | 120 | 1 minute | Provider callbacks |
| `general-api` | 300 | 1 minute | Lower-risk API traffic |
| `health-internal` | 120 | 1 minute | Health and internal probes |

## Key construction

Limiter keys should include route, action, user, organization and hashed client context where available. Raw IP addresses and raw user-agent values should not be stored in limiter keys or audit metadata.

## Response contract

Blocked HTTP routes return standard rate-limit headers: `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`.

## Validation

Run:

```bash
npm run test -- src/server/security/rate-limit.enterprise.test.ts src/lib/security/rate-limit.test.ts tests/unit/rate-limit.test.ts
npm run security:api-guards
npm run security:enterprise-api
npm run lint
npm run typecheck
```
