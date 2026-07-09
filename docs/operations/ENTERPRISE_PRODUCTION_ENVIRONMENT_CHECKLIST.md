# Enterprise Production Environment Checklist

This checklist defines the production-like environment required before RISCK COMPLY can be marked Enterprise Go.

Do not paste secret values into GitHub, docs, issues, PRs, Slack or support tools. Record only whether each provider setting exists and whether runtime validation passed.

## Required command

```bash
npm run release:production-final
```

The command now runs `scripts/release/check-enterprise-release-env.mjs` first. That script writes redacted evidence to:

```text
docs/security/evidence/runtime/enterprise-release-env-readiness.json
```

## Required GitHub Actions / Vercel secret groups

| Group | Required sources | Gate |
| --- | --- | --- |
| Release target URL | `RELEASE_DEPLOYMENT_URL` or `RELEASE_PRODUCTION_URL` or approved app/site URL source | Deployment smoke cannot run without this. |
| Healthcheck auth | `HEALTHCHECK_TOKEN` | `/api/ready` and observability smoke must be protected. |
| Release metadata | `RELEASE_COMMIT_SHA`/`GITHUB_SHA` and `RELEASE_BUILD_SHA`/build SHA source | Evidence must tie to exact commit/build. |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Readiness and live RLS validation. |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, starter/growth/enterprise price IDs or accepted legacy fallbacks | Billing readiness and webhook replay/idempotency. |
| Redis/rate limit | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate-limit readiness and abuse controls. |
| Sentry runtime | `NEXT_PUBLIC_SENTRY_DSN` or `SENTRY_DSN` | Observability readiness. |
| Sentry source maps | `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Required for enterprise release source-map upload readiness. |
| Rollback URL | `RELEASE_ROLLBACK_TARGET`, `RELEASE_ROLLBACK_TARGET_URL` or `LAST_KNOWN_GOOD_DEPLOYMENT_URL` | Rollback dry-run. |
| Rollback commit | `RELEASE_ROLLBACK_TARGET_SHA`, `RELEASE_ROLLBACK_TARGET_COMMIT_SHA`, `LAST_KNOWN_GOOD_COMMIT_SHA` or `LAST_KNOWN_GOOD_SHA` | Rollback target must be traceable. |
| Rollback validation | `RELEASE_ROLLBACK_TARGET_VALIDATED=true` | Must only be set after functional validation. |
| Upload scanner | `REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true`, `MALWARE_SCANNER_PROVIDER`, and either HTTP scanner endpoint + allowed hosts or ClamAV host + port | Enterprise upload scanning must fail closed. |

## Stripe price ID fallback rules

Preferred price IDs:

- `STRIPE_PRICE_STARTER_MONTHLY`
- `STRIPE_PRICE_GROWTH_MONTHLY`
- `STRIPE_PRICE_ENTERPRISE_MONTHLY`

Accepted legacy fallbacks:

- `STRIPE_PRICE_ESSENTIAL_MONTHLY`
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY` or `STRIPE_PRICE_BUSINESS_MONTHLY`
- `STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY`

## Upload scanner transport rules

Approved provider modes:

- `clamav` / `clamd`: requires `MALWARE_SCANNER_CLAMAV_HOST` and `MALWARE_SCANNER_CLAMAV_PORT`.
- `http` / `generic-http` / `webhook`: requires `MALWARE_SCANNER_ENDPOINT` or `MALWARE_SCANNER_URL`, plus `MALWARE_SCANNER_ALLOWED_HOSTS`.

Do not use `mock`, `test`, `dev-mock`, `none` or `disabled` for enterprise production.

## Go rule

Enterprise Go is allowed only when:

- env preflight is `Complete/passed`;
- production smoke is `Complete/passed`;
- observability smoke is `Complete/passed`;
- rollback dry-run is `Complete/passed`;
- Supabase live RLS is `Complete/passed` against the correct project;
- branch protection evidence is `Complete/passed`;
- external security review/pentest evidence is real and complete;
- `release-go-no-go.json` says `finalDecision: Go`.

Until then, release remains **No-Go**.
