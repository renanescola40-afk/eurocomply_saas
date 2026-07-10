# Release Evidence Checklist

This checklist records the evidence required before RISCK COMPLY can be represented as production-ready or enterprise-ready.

## Current release assessment

- Release name: RISCK COMPLY Enterprise Production Final Gate
- Assessment date: 2026-07-10
- Repository: `renanescola40-afk/eurocomply_saas`
- Release owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Support owner: @renansilva2002 / renanescola40-afk
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
| Database and RLS evidence | Required from target Supabase project | Yes |
| Audit-chain evidence | Required from target-live validation | Required for enterprise |
| Step-up authentication evidence | Required from real MFA/IdP provider proof | Required for enterprise |
| Upload scanning evidence | Required from runtime scanner validation | Yes |
| Billing evidence | Required from Stripe runtime validation and webhook readiness | Yes |
| Observability evidence | Required from deployment smoke and observability smoke | Yes |
| Branch protection evidence | Required from GitHub ruleset/branch protection proof | Required for enterprise |
| External review evidence | Required from real external review report or approved enterprise exception | Required for enterprise |
| Support readiness | Required support owner, escalation path, incident communication cadence and customer handoff | Yes |
| Customer communication | Required SEV communication timing, customer update owner and no-secret/no-PII messaging rules | Yes |
| Release decision | No-Go until exact commit has passing evidence bundle and zero P0 Open/Exception blockers | Yes |

## Required command validation evidence

| Command | Required before Go |
| --- | --- |
| `node scripts/release/check-enterprise-release-env.mjs` | Yes |
| `npm ci` | Yes |
| `npm run lint` | Yes |
| `npm run typecheck` | Yes |
| `npm run test` | Yes |
| `npm run build` | Yes |
| `npx playwright install --with-deps` | Yes |
| `npm run test:e2e` | Yes |
| `npm run security:ci` | Yes |
| `npm run security:rls:live` | Yes |
| `npm run release:deployment-smoke` | Yes |
| `npm run release:observability-smoke` | Yes |
| `npm run release:rollback:dry-run` | Yes |
| `npm run security:branch-protection-evidence` | Required for enterprise |
| `npm run security:release-candidate` | Required for enterprise |
| `npm run security:release-evidence` | Required for enterprise |
| `npm run security:release-approval` | Required for enterprise |
| `npm run security:release-go-no-go` | Required for enterprise |
| `npm run security:release-support-readiness` | Required for enterprise |
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

## Support readiness and customer communication evidence

Before Go, the release record must include:

- support owner;
- customer communication owner;
- escalation path;
- SEV-1/SEV-2 customer update timing;
- rollback communication owner;
- customer-safe message rules forbidding secrets, raw logs, tokens, cookies, stack traces, exploit details and customer PII;
- status page decision criteria;
- explicit No-Go/Conditional Go language for any unresolved exception.

## Evidence still blocking enterprise Go

| Area | Current gap | Release impact |
| --- | --- | --- |
| GitHub Actions final run | Enterprise Production Gate still fails before all runtime evidence is Complete/passed | Blocks Go |
| Vercel production deployment | Target deployment must expose all production runtime envs to `/api/ready` | Blocks Go |
| Deployment smoke | `/api/ready` currently fails critical dependency readiness on `https://www.risckcomply.com` | Blocks Go |
| Supabase live RLS | Current live RLS validation timed out querying inventory | Blocks Go |
| Branch protection | Required checks/ruleset evidence must be Complete | Blocks enterprise Go |
| MFA/IdP | Real provider runtime proof must be attached | Blocks enterprise Go |
| Audit chain | Target live validation must pass | Blocks enterprise Go |
| External review | Real report or approved enterprise exception must be attached | Blocks enterprise pilot/procurement |

## Release decision

**Final decision: No-Go for production / enterprise.**

Repository-side gates are stronger, but the project is not production-ready or enterprise-ready until the remaining P0 runtime evidence is generated from real target environments and the strict gates pass without Open or Exception evidence.
