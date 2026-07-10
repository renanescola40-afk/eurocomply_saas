# Release Evidence Checklist

This checklist records the evidence required before RISCK COMPLY can be represented as production-ready or enterprise-ready.

## Current release assessment

- Release name: RISCK COMPLY Enterprise Production Final Gate
- Assessment date: 2026-07-10
- Repository: `renanescola40-afk/eurocomply_saas`
- Release owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Support readiness owner: @renansilva2002 / renanescola40-afk
- Customer communication owner: @renansilva2002 / renanescola40-afk
- Target environment: production / enterprise candidate
- Implementation hardening: **99.9%**
- Final decision: **No-Go until real runtime evidence is Complete/passed for the promoted commit**

## Required release evidence categories

| Evidence category | Current status | Required before Go |
| --- | --- | --- |
| Build and CI evidence | Required from exact release commit final validation bundle | Yes |
| Supply-chain evidence | Required from deterministic install, lockfile alignment, audit triage, SBOM and dependency review | Yes |
| Enterprise env readiness | Required from `enterprise-release-env-readiness.json` | Yes |
| Vercel runtime environment | Required from `/api/ready` deployment smoke against the promoted Production deployment | Yes |
| Database and RLS evidence | Required from target Supabase project | Yes |
| Audit-chain evidence | Required from target-live validation | Required for enterprise |
| Step-up authentication evidence | Required from real MFA/IdP provider proof | Required for enterprise |
| Upload scanning evidence | Required from runtime scanner validation | Yes |
| Billing evidence | Required from Stripe runtime validation and webhook readiness | Yes |
| Observability evidence | Required from deployment smoke and observability smoke | Yes |
| Branch protection evidence | Required from GitHub ruleset/branch protection proof | Required for enterprise |
| Support readiness | Required from support owner, escalation path, status-page/customer-update timing and handoff evidence | Required for enterprise |
| Customer communication | Required from customer-safe incident/update templates that do not expose secrets or unsupported claims | Required for enterprise |
| External review evidence | Required from real external review report or approved enterprise exception | Required for enterprise |
| Release decision | No-Go until exact commit has passing evidence bundle and zero P0 Open/Exception blockers | Yes |

## Required Vercel Production environment

The GitHub Actions preflight only proves that GitHub Actions can read the release configuration. Deployment smoke proves that the live Vercel Production runtime can read the same operational configuration through `/api/ready`.

Before Enterprise Go, Vercel Production must be redeployed after these values are configured:

| Group | Required runtime names |
| --- | --- |
| Protected readiness | `HEALTHCHECK_TOKEN` |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_GROWTH_MONTHLY`, `STRIPE_PRICE_ENTERPRISE_MONTHLY` |
| Redis / Upstash | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` |
| Upload scanner | `REQUIRE_MALWARE_SCAN_FOR_UPLOADS=true`, `MALWARE_SCANNER_PROVIDER`, `MALWARE_SCANNER_URL`, `MALWARE_SCANNER_ALLOWED_HOSTS`, `CLOUDMERSIVE_API_KEY`, `MALWARE_SCANNER_API_KEY` |
| Storage | Document upload bucket must resolve to `controlled-documents` through the project upload configuration. |

If `/api/ready` returns `503`, the deployment smoke is correct to block Enterprise Go. Do not mark the release Go until the live deployment returns `status: ready` with no critical dependency gaps.

## Required command validation evidence

| Command | Required before Go |
| --- | --- |
| `node scripts/release/check-enterprise-release-env.mjs` | Yes |
| `npm ci` | Yes |
| `npm run lint` | Yes |
| `npm run typecheck` | Yes |
| `npm run test` | Yes |
| `npm run build` | Yes |
| `npm run test:e2e` | Yes |
| `npm run security:ci` | Yes |
| `npm run security:rls:live` | Yes |
| `npm run release:deployment-smoke` | Yes |
| `npm run release:observability-smoke` | Yes |
| `npm run release:rollback:dry-run` | Yes |
| `node scripts/release/write-enterprise-runtime-evidence.mjs` | Yes |
| `npm run release:enterprise-runtime-evidence` | Required for enterprise |
| `npm run security:p0-runtime-gap:strict` | Required for enterprise |
| `npm run release:production-final` | Canonical final gate |

## Required runtime evidence files

| Evidence | Required status before Go | Blocks |
| --- | --- | --- |
| `enterprise-release-env-readiness.json` | Complete / passed | Production + enterprise |
| `production-secrets-provider-stores.json` | Complete / passed | Production + enterprise |
| `deployment-smoke-validation.json` | Complete / passed | Production + enterprise |
| `observability-smoke-validation.json` | Complete / passed | Production + enterprise |
| `rollback-dry-run-validation.json` | Complete / passed | Production + enterprise |
| `supabase-live-rls-validation.json` | Complete / passed | Production + enterprise |
| `stripe-billing-validation.json` | Complete / passed | Paid launch |
| `upload-malware-scan-validation.json` | Complete / passed | Enterprise upload features |
| `branch-protection-required-checks.json` | Complete / passed | Enterprise |
| `step-up-mfa-validation.json` | Complete / passed | Enterprise |
| `audit-chain-live-validation.json` | Complete / passed | Enterprise |
| `auth-rbac-final-validation.json` | Complete / passed with real target proof | Enterprise |
| `external-security-review-or-pentest.json` | Complete / passed with real report reference | Enterprise |
| `final-validation-runner.json` | Complete / passed | Production + enterprise |
| `enterprise-runtime-evidence.json` | Complete / passed | Enterprise |
| `release-go-no-go.json` | Complete / passed with `finalDecision: Go` | Production + enterprise |

## Evidence still blocking enterprise Go

| Area | Current gap | Release impact |
| --- | --- | --- |
| GitHub Actions final run | Must run Enterprise Production Gate with production secrets | Blocks Go |
| Vercel production deployment | Must be Ready for promoted commit and redeployed after env changes | Blocks Go |
| Enterprise env readiness | Must be regenerated by real runner | Blocks Go |
| Deployment smoke | Real deployment URL functional smoke must pass | Blocks Go |
| Observability smoke | Auth/no-store/request ID/Sentry readiness must pass | Blocks Go |
| Rollback | Known-good rollback target must be dry-run verified | Blocks Go |
| Supabase live RLS | Must be target project proof for promoted release | Blocks Go |
| Branch protection | Required checks/ruleset evidence must be Complete | Blocks enterprise Go |
| MFA/IdP | Real provider runtime proof must be attached | Blocks enterprise Go |
| Audit chain | Target live validation must pass | Blocks enterprise Go |
| External review | Real report or approved enterprise exception must be attached | Blocks enterprise pilot/procurement |

## Release decision

**Final decision: No-Go for production / enterprise.**

Repository-side gates are stronger, but the project is not production-ready or enterprise-ready until the remaining P0 runtime evidence is generated from real target environments and the strict gates pass without Open or Exception evidence.
