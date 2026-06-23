# Enterprise rate limiting and abuse protection

EuroComply applies centralized server-side rate limiting from `src/server/security/rate-limit.ts` before sensitive work is performed. The control is designed for abuse prevention across brute-force auth flows, password reset, step-up challenge abuse, scraping, export abuse, upload abuse, billing abuse, GDPR delete abuse, audit-chain verification exhaustion, and webhook flood attempts.

## Runtime model

- Production uses Upstash Redis through `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- Development and test are the only environments allowed to use the in-memory bucket fallback.
- Production high-risk policies always fail closed when Redis is missing, unavailable, or returns an invalid response.
- Low-risk policies such as `general-api` and `health-internal` fail according to explicit policy, so read/health surfaces do not become an outage amplifier.
- Upstash is called with a REST pipeline using `INCR`, `EXPIRE ... NX`, and `TTL`; the parser accepts both object-style REST results and tuple-style results.

## Policies

| Policy | Primary surfaces | Default limit | Window | Production failure mode | High risk | UA hash |
| --- | --- | ---: | ---: | --- | --- | --- |
| `auth` | login, signup, auth callbacks | 5 | 15 minutes | fail closed | yes | yes |
| `password-reset` | password reset request and token verification | 3 | 1 hour | fail closed | yes | yes |
| `step-up-challenge` | MFA/IdP step-up challenge and verification | 5 | 5 minutes | fail closed | yes | yes |
| `billing-checkout` | checkout session creation | 10 | 1 minute | fail closed | yes | yes |
| `billing-portal` | customer portal session creation | 10 | 1 minute | fail closed | yes | yes |
| `upload` | controlled document upload and scan entrypoints | 20 | 10 minutes | fail closed | yes | yes |
| `export` | CSV, evidence, GDPR, vendor, continuity, and governance exports | 5 | 10 minutes | fail closed | yes | yes |
| `gdpr-delete` | GDPR delete request workflow | 3 | 1 hour | fail closed | yes | yes |
| `audit-chain-verify` | audit-chain verification | 10 | 1 hour | fail closed | yes | yes |
| `webhook` | Stripe and billing webhook processing | 120 | 1 minute | fail closed | yes | no |
| `general-api` | lower-risk authenticated API reads | 300 | 1 minute | fail open | no | no |
| `health-internal` | health, readiness, and internal probes | 120 | 1 minute | fail open | no | no |

Legacy aliases such as `billing`, `step-up`, `health/internal`, `gdpr`, and `audit-chain` remain available for compatibility, but new code should use the named policy IDs above.

## Key construction

New callers should use `checkRateLimitPolicy(policy, subject)` or pass explicit subject dimensions to `checkDistributedRateLimit()`:

- `route`, for route-level isolation;
- `action`, for operation-level isolation inside shared routes;
- `userId`, when authenticated;
- `organizationId`, when tenant context exists;
- hashed IP material, derived from `x-forwarded-for`, `x-real-ip`, `x-vercel-forwarded-for`, or `cf-connecting-ip`;
- hashed user-agent material for high-risk browser-facing policies.

Raw IP addresses, raw user agents, and raw limiter keys are not stored in Redis keys produced by subject-aware calls and are not written to audit metadata. Hashing uses `RATE_LIMIT_IP_HASH_SALT`, falling back to `NEXTAUTH_SECRET`, `AUTH_SECRET`, or a development-only salt.

## Guards and response contract

`src/server/security/api-guards.ts` exposes `requireRateLimit()`, `requireEnterpriseRateLimit()`, and `requireTrustedMutation()`. `requireTrustedMutation()` enriches caller-supplied policy data with IP, user-agent, route, and action data from the request before applying the limiter.

Blocked HTTP routes use `rateLimitResponse()`, which returns:

- `429` for normal limit exhaustion;
- `503` for fail-closed production dependency failures;
- `Retry-After`;
- `RateLimit-Limit`;
- `RateLimit-Remaining`;
- `RateLimit-Reset`.

`RateLimit-Reset` is emitted as seconds until reset to avoid leaking internal wall-clock details and to keep retry clients simple.

## Audit events

Blocked requests write one of two audit actions:

- `rate_limit_blocked` for low-risk policies with auditing enabled;
- `high_risk_rate_limit_blocked` for high-risk policies.

Audit metadata includes policy, category, high-risk flag, failure mode, reason, remaining count, retry-after seconds, route, limited action, and `keyHash`. The audit event never stores the raw Redis key, raw IP address, raw user-agent string, bearer tokens, cookies, or request body values.

## Sensitive endpoint coverage

Current coverage includes:

- `/api/billing/checkout` with `billing-checkout`;
- `/api/billing/portal` with `billing-portal`;
- `/api/documents/upload` with `upload`;
- `/api/gdpr/export` and other export endpoints through `export`;
- `/api/gdpr/delete-request` with `gdpr-delete`;
- `/api/audit/chain/verify` with `audit-chain-verify`;
- `/api/security/step-up/challenge` with `step-up-challenge`;
- `/api/billing/webhook` and `/api/stripe/webhook` with `webhook`;
- lower-risk API surfaces through `general-api` when explicit lower-risk behavior is justified.

## Validation

Run:

```bash
npm run test -- src/server/security/rate-limit.enterprise.test.ts src/lib/security/rate-limit.test.ts tests/unit/rate-limit.test.ts
npm run security:api-guards
npm run security:enterprise-api
npm run lint
npm run typecheck
```

The focused tests verify requests below the limit pass, requests above the limit block, high-risk production routes fail closed when Redis is unavailable, development/test fallback does not block purely because Redis is unavailable, tenant buckets do not interfere with each other, and standard rate-limit headers are emitted. The security CI gates continue to scan sensitive and high-risk API routes for rate-limit guard tokens.
