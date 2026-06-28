# Release Evidence Checklist

This checklist records the evidence required before EuroComply can be represented as beta-ready, production-ready, enterprise-ready, or procurement-ready.

## Current release assessment

- Release name: EuroComply P0 Enterprise Evidence Gate Wiring - 2026-06-28
- Assessment date: 2026-06-28
- Repository: `renanescola40-afk/eurocomply_saas`
- Release owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Target environment: production / enterprise candidate
- Final decision: **No-Go for production / enterprise until remaining real runtime evidence is attached**

## Required release evidence categories

| Evidence category | Current status | Required before Go |
| --- | --- | --- |
| Build and CI evidence | Required from exact release commit final validation bundle | Yes |
| Supply-chain evidence | Required from deterministic install, lockfile alignment, npm audit triage, SBOM and dependency review | Yes |
| Database and RLS evidence | **Complete / passed** by `docs/security/evidence/runtime/supabase-live-rls-validation.json` | Yes |
| Audit-chain evidence | Exception until target-live validation is Complete | Required for enterprise |
| Step-up authentication evidence | Exception until real MFA/IdP provider proof is Complete | Required for enterprise |
| Upload scanning evidence | Existing live scanner evidence is positive; revalidate before enterprise/provider change | Yes |
| Billing evidence | Existing Stripe runtime validation is positive; revalidate before billing/provider change | Yes |
| Observability evidence | Repository evidence positive; deployment smoke and drill/sign-off still required | Yes |
| External review evidence | Open/not_started until real external review or pentest evidence exists | Required for enterprise |
| Release decision | No-Go until the exact commit has passing evidence bundle and zero P0 Open/Exception blockers | Yes |

## GitHub enterprise evidence

| Evidence | Status | Required before Go |
| --- | --- | --- |
| Full Security Suite required check list | Documented | Yes |
| Branch protection / ruleset API proof | **Exception** | Required for enterprise |
| `RELEASE_TARGET=enterprise npm run security:branch-protection-evidence` | Expected to fail until evidence is `Complete` | Required for enterprise |
| Direct push to `main` risk record | Documented | Yes |
| SBOM artifact name | `risck-comply-sbom` required | Yes |
| Secret scanning mode | Strict fail-closed required | Yes |
| Package lock alignment | Required; package metadata must not drift from lockfile | Yes |

## Command validation evidence

| Command | Status | Required before Go |
| --- | --- | --- |
| `npm ci` | Required in final validation runner | Yes |
| `npm run lint` | Required in CI / Full Security Suite / final validation | Yes |
| `npm run typecheck` | Required in CI / Full Security Suite / final validation | Yes |
| `npm run test` | Required in CI / Full Security Suite / final validation | Yes |
| `npm run test:e2e` | Required in final validation runner | Yes |
| `npm run build` | Required in Full Security Suite / final validation | Yes |
| `npm run security:ci` | Required with strict public scanning enabled | Yes |
| `npm run release:deployment-smoke` | Added; writes `deployment-smoke-validation.json`; expected to fail without real deployment URL and protected readiness token | Yes |
| `npm run release:rollback:dry-run` | Added; writes `rollback-dry-run-validation.json`; expected to fail without verified rollback target proof | Yes |
| `npm run release:readiness` | Updated to include deployment smoke, rollback dry-run and P0 runtime gap report | Yes |
| `npm run release:enterprise-runtime-evidence` | Added; fails unless required enterprise runtime evidence files are Complete/non-placeholder | Required for enterprise |
| `npm run release:enterprise-readiness` | Updated to include RLS, MFA/IdP runtime, audit-chain live, upload scanner, branch protection, readiness, enterprise runtime evidence and strict P0 gap | Required for enterprise |
| `node scripts/release/run-final-validation.mjs` | Updated to emit `final-validation-runner.json` and run smoke/rollback/readiness bundle | Yes |

## Deployment and runtime evidence

| Evidence | Status | Impact |
| --- | --- | --- |
| Vercel preview deployment | Required before production Go | Positive, not approval |
| Vercel commit status | Required for exact release commit | Positive, not approval |
| Deployment URL functional verification | **Open unless `deployment-smoke-validation.json` is Complete/passed for exact commit** | Blocks Go |
| Preview and production smoke tests | **Open unless attached for exact commit** | Blocks Go |
| Production secrets provider stores | Complete as provider-store evidence; runtime preflight still required | Positive, not enough for Go |
| Supabase live RLS validation | **Complete / passed** | Closed P0-RLS-003 |
| Stripe runtime validation | Existing evidence Complete/passed | Positive, revalidate before billing change |
| MFA / IdP runtime validation | **Exception / provider proof absent unless attached** | Blocks enterprise Go |
| Upload scanner live proof | Existing evidence Complete/passed | Positive, revalidate before enterprise release/provider change |
| Audit-chain live validation | **Exception / target validation required unless attached** | Blocks enterprise Go |
| Observability readiness | Complete as repository evidence; deployment smoke/drill proof pending | Positive, not enough for Go |
| Rollback target | **Open until `rollback-dry-run-validation.json` is Complete/passed** | Blocks Go |
| Incident/support owners | Assigned | Positive; drill/sign-off remains required |
| External review | **Open / not_started until real report is attached** | Blocks enterprise pilot/procurement |

## Evidence still blocking enterprise Go

| Area | Current gap | Release impact |
| --- | --- | --- |
| Branch protection | Evidence is `Exception`, not `Complete` | Blocks enterprise Go |
| Required checks | Must be confirmed in GitHub Settings → Rulesets/Branches → main | Blocks enterprise Go |
| Final validation | Exact final validation runner output must be attached for promoted commit | Blocks all Go paths |
| Deployment smoke | Real deployment URL functional smoke must be attached | Blocks production/public/enterprise Go |
| MFA/IdP | Real provider runtime proof must be attached | Blocks enterprise Go |
| Audit chain | Target live validation must be attached | Blocks enterprise Go |
| External review | Real external review evidence must be attached | Blocks enterprise pilot/procurement |
| Rollback | Rollback target must be dry-run verified | Blocks Go |

## Release decision

**Final decision: No-Go for production / enterprise.**

Repository-side gates are stronger after the P0 evidence wiring work, and Supabase RLS is no longer an open blocker. The project is still not production-ready or enterprise-ready until the remaining P0 runtime evidence is generated from real target environments and the strict gates pass without Open or Exception evidence.
