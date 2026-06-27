# Release Evidence Checklist

This checklist records the evidence required before EuroComply can be represented as beta-ready, production-ready, enterprise-ready, or procurement-ready.

## Current release assessment

- Release name: EuroComply GitHub Enterprise Hardening Review - 2026-06-25
- Assessment date: 2026-06-25
- Repository: `renanescola40-afk/eurocomply_saas`
- Release owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Target environment: production / enterprise candidate
- Final decision: **No-Go for enterprise**

## Required release evidence categories

| Evidence category | Current status | Required before Go |
| --- | --- | --- |
| Build and CI evidence | Required from exact release commit final validation bundle | Yes |
| Supply-chain evidence | Required from lockfile alignment, npm audit triage, SBOM and dependency review | Yes |
| Database and RLS evidence | Supabase live RLS validation must be attached for production/enterprise | Yes |
| Audit-chain evidence | Required for enterprise; production may carry structured non-complete evidence until enterprise gate | Required for enterprise |
| Step-up authentication evidence | Provider proof required for enterprise protected actions | Required for enterprise |
| Upload scanning evidence | Required when uploads are enabled; fail-closed proof required for enterprise | Yes |
| Billing evidence | Stripe runtime/webhook validation required when paid plans are active | Yes |
| Observability evidence | Logging, monitoring, incident and support owner evidence required | Yes |
| External review evidence | Independent review/pentest required for enterprise pilot/procurement | Required for enterprise |
| Release decision | Go / Conditional Go / No-Go decision must be recorded for the exact commit | Yes |

## GitHub enterprise evidence

| Evidence | Status | Required before Go |
| --- | --- | --- |
| Full Security Suite required check list | Documented | Yes |
| Branch protection / ruleset API proof | **Exception** | Required for enterprise |
| `RELEASE_TARGET=enterprise node scripts/security/check-branch-protection-evidence.mjs` | Expected to fail until evidence is `Complete` | Required for enterprise |
| Direct push to `main` risk record | Documented | Yes |
| SBOM artifact name | `risck-comply-sbom` required | Yes |
| Secret scanning mode | Strict fail-closed required | Yes |
| Package lock alignment | **Open until `package-lock.json` matches `package.json`** | Yes |

## Command validation evidence

| Command | Status | Required before Go |
| --- | --- | --- |
| `npm ci --ignore-scripts` | Required in Full Security Suite | Yes |
| `node scripts/security/check-package-lock-alignment.mjs` | Added as repository gate; expected to fail until lockfile drift is fixed | Yes |
| `npm run lint` | Required in CI / Full Security Suite | Yes |
| `npm run typecheck` | Required in CI / Full Security Suite | Yes |
| `npm run test` | Required in CI / Full Security Suite | Yes |
| `npm run build` | Required in Full Security Suite | Yes |
| Run `npm run security:ci` with strict public scanning enabled | Required; report-only secret scanning is not acceptable | Yes |
| `npm run release:readiness` | Required before production Go | Yes |
| `npm run release:enterprise-readiness` | Required before enterprise Go | Required for enterprise |
| `node scripts/release/run-final-validation.mjs` | Required before production/enterprise Go | Yes |

## Deployment and runtime evidence

| Evidence | Status | Impact |
| --- | --- | --- |
| Vercel preview deployment | Required before production Go | Positive, not approval |
| Vercel commit status | Required for exact release commit | Positive, not approval |
| Deployment URL functional verification | **Open unless attached for exact commit** | Blocks Go |
| Preview and production smoke tests | **Open unless attached for exact commit** | Blocks Go |
| Production secrets provider stores | Required | Positive; runtime preflight still required |
| Supabase live RLS validation | **Open unless target evidence is attached** | Blocks production and enterprise Go |
| Stripe runtime validation | Required for paid billing evidence | Positive when current |
| MFA / IdP runtime validation | **Exception / provider proof absent unless attached** | Blocks enterprise Go |
| Upload scanner live proof | Required when uploads are enabled | Positive when current |
| Audit-chain live validation | **Exception / target validation required unless attached** | Blocks enterprise Go |
| Observability readiness | Required as repository and runtime evidence | Positive; deployment smoke and drill proof still required |
| Rollback target | Candidate-only unless dry-run evidence exists | Blocks Go until verified |
| Incident/support owners | Required | Positive; drill/sign-off remains required |
| External review | **Open / not_started unless real report is attached** | Blocks enterprise pilot/procurement |

## Evidence still blocking enterprise Go

| Area | Current gap | Release impact |
| --- | --- | --- |
| Branch protection | Evidence is `Exception`, not `Complete` | Blocks enterprise Go |
| Required checks | Must be confirmed in GitHub Settings → Rulesets/Branches → main | Blocks enterprise Go |
| Lockfile | `package-lock.json` root metadata must match `package.json` | Blocks CI / enterprise Go |
| Secret scanning | Strict public scanning must be enabled and fail on real values | Blocks CI / enterprise Go |
| Final validation | Exact final validation runner output must be attached | Blocks all Go paths |
| Deployment smoke | Deployment URL functional smoke must be attached | Blocks production/public/enterprise Go |
| RLS live validation | Target-environment tenant-isolation evidence must be attached | Blocks production and enterprise Go |
| MFA/IdP | Real provider runtime proof must be attached | Blocks enterprise Go |
| Audit chain | Target live validation must be attached | Blocks enterprise Go |
| External review | Real external review evidence must be attached | Blocks enterprise pilot/procurement |
| Rollback | Rollback target must be dry-run verified | Blocks Go |

## Release decision

**Final decision: No-Go for enterprise.**

Repository-side security policy, branch-protection evidence contract, direct-push risk documentation, and lockfile alignment gate are now represented in code/docs. Enterprise release remains blocked until GitHub branch protection evidence is `Complete`, `package-lock.json` aligns with `package.json`, and the exact release commit has green Full Security Suite plus runtime/release evidence.
