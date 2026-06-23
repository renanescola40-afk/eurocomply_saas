# Release Evidence Checklist

This checklist defines the evidence package that must be attached to a EuroComply release before promoting it beyond private beta. It complements `docs/RELEASE_CANDIDATE_VALIDATION.md` by focusing on artifacts that cannot be proven by static source checks alone.

## Current release assessment

- Release name: EuroComply Final Release Readiness - 2026-06-22
- Assessment date: 2026-06-22
- Promoted commit assessed: `7794d552d44784f906451b308b367d30c06ecc4c`
- Assessment branch: `release/final-readiness-2026-06-22`
- Release owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Support owner: not approved / must be assigned before release
- Target environment: production / enterprise candidate
- Final decision: **No-Go**
- Decision report: `docs/RELEASE_FINAL_READINESS_REPORT.md`

## Release identity evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| Release name | Complete | `EuroComply Final Release Readiness - 2026-06-22` | None |
| Commit SHA | Complete | `7794d552d44784f906451b308b367d30c06ecc4c` | None |
| Date | Complete | `2026-06-22` | None |
| Release owner | Complete | @renansilva2002 / renanescola40-afk | None |
| Approver | Missing | No independent approval recorded | Blocks Go |
| Target environment | Partial | Production / enterprise candidate declared, but deployment URL is not proven | Blocks production / enterprise Go |
| Deployment URL | Missing | No successful deployment URL attached; current commit status only shows Vercel failure target | Blocks Go |
| Rollback plan | Partial | Runbook exists; previous known-good deployment not attached | Blocks Go |
| Incident response owner | Missing | Not formally signed in approval record | Blocks Go |
| Rollback owner | Missing | Not formally signed in approval record | Blocks Go |
| Support owner | Missing | Not formally signed in approval record | Blocks public/enterprise Go |

## Command validation evidence

The following release validation commands were requested. They are **not marked as executed** because no preserved local or CI logs are attached for this release assessment and no GitHub Actions workflow run was available for the assessed merge commit.

| Command | Status | Evidence | Owner | Required before Go |
| --- | --- | --- | --- | --- |
| `npm ci` | Missing evidence | No install log attached | Engineering owner | Yes |
| `npm run lint` | Missing evidence | No lint log attached | Engineering owner | Yes |
| `npm run typecheck` | Missing evidence | No typecheck log attached | Engineering owner | Yes |
| `npm run test` | Missing evidence | No unit test log attached | Engineering owner | Yes |
| `npm run test:e2e` | Missing evidence | No Playwright run/log attached | Engineering owner | Yes |
| `npm run build` | Failed / missing log | Commit status shows Vercel failure; no successful build log attached | Platform owner | Yes |
| `npm run security:ci` | Missing evidence | No security CI log attached | Security owner | Yes |
| `npm run release:readiness` | Missing evidence | No release readiness log attached | Release owner | Yes |

## Build and CI evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| CI run URL | Missing | GitHub workflow runs for the assessed merge commit were not found | Blocks Go |
| Build log | Missing / failed | Vercel commit status is `failure`; no successful build artifact/log attached | Blocks Go |
| Deployment URL | Missing | No successful production/preview deployment URL attached | Blocks Go |
| Required status checks | Partial | `docs/security/evidence/runtime/required-status-checks.json`; also resolve stale/conflicting `docs/security/evidence/runtime/branch-protection-required-checks.json` exception before Go | Blocks until current GitHub settings and required checks are revalidated |
| Branch protection | Partial | `docs/security/evidence/runtime/branch-protection-main.json` says Complete; current admin revalidation still required before release | Blocks until revalidated |
| High/critical vulnerability triage | Missing release artifact | `npm audit` output for the assessed commit is not attached | Blocks Go |

## Production environment and secrets evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| Secrets provider | Complete as inventory | `docs/security/evidence/runtime/production-secrets-provider-stores.json` | Values remain private; acceptable only with reviewer confirmation |
| Environment variables | Partial | Provider names and variable names are inventoried with values redacted | Requires production preflight output before Go |
| Production preflight | Missing evidence | No `npm run preflight` or readiness output attached | Blocks Go |

## Supply-chain evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| Deterministic lockfile | Complete in register | `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` | Requires `npm ci` log for assessed commit |
| Floating dependency review | Complete in register | `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` | Requires release command log before Go |
| npm audit | Missing release artifact | No preserved `npm audit` or `security:npm-audit:all` output attached | Blocks Go |

## Supabase and RLS evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| RLS live validation | **Open / not run** | `docs/security/evidence/runtime/supabase-live-rls-validation.json` | **P0 blocker** |
| Tenant A/B cross-tenant denial | Missing live evidence | Must be generated by `scripts/security/run-supabase-live-tenant-isolation.mjs --update-register` | Blocks public/enterprise Go |
| Service-role path review | Missing live release artifact | Not attached for target environment | Blocks enterprise Go |

## Audit-chain evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| Audit-chain implementation and tests | Complete as repository evidence | `docs/security/evidence/runtime/audit-chain-live-validation.json` | Acceptable for implementation readiness |
| Live production/customer-specific verification | Partial | Evidence notes a customer-specific live run still needs production Supabase credentials, signing material and step-up assertion | Blocks enterprise until live target evidence is attached |
| Signing material | Partial | Required secrets inventoried in provider evidence; no runtime proof attached | Requires live preflight before Go |

## Upload content scanning evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| Upload validation | Complete as repository evidence | `docs/security/evidence/runtime/upload-malware-scan-validation.json` | Acceptable for implementation readiness |
| Enterprise fail-closed scanning | Complete as repository evidence | Same evidence records fail-closed behavior | Requires target scanner provider live proof before enterprise Go |
| Real scanner provider | Partial | Provider variables inventoried; no live scanner run attached | Blocks enterprise until live provider evidence is attached |

## Stripe and billing evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| Checkout / portal / webhook controls | Complete | `docs/security/evidence/runtime/stripe-billing-validation.json`; generated by `node scripts/security/run-stripe-runtime-validation.mjs` | Paid-production billing implementation gate satisfied |
| Stripe webhook signature validation | Complete | Evidence records missing and invalid signatures fail closed before handler dispatch | None for billing implementation gate |
| Stripe webhook idempotency | Complete | Evidence records duplicate event replay is skipped before state mutation and audited as `webhook_replayed` | None for billing implementation gate |
| Stripe runtime test execution | Complete | Evidence `validationStatus` is `passed`; focused tests cover checkout, portal, signature validation, duplicate replay, subscription lifecycle and customer mismatch | Attach CI log for release archive |

## Step-up / MFA / IdP evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| Step-up control implementation | Complete as repository evidence | `docs/security/evidence/runtime/step-up-mfa-validation.json` | Good implementation evidence |
| Real MFA/IdP runtime execution | Partial | Evidence states live provider execution must run with real Supabase MFA or enterprise IdP credentials | Blocks enterprise Go until target-provider proof exists |
| Fail-closed provider gate | Complete as repository evidence | Same evidence records fail-closed release gate | Requires preflight output before Go |

## Observability, incident response and rollback evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| Observability implementation | Complete as repository evidence | `docs/security/evidence/runtime/observability-readiness.json` | Good implementation evidence |
| CI output for observability gates | Missing | Evidence notes CI command output must be attached before production sign-off | Blocks Go |
| Incident response owner | Missing final sign-off | Must be named in `docs/RELEASE_APPROVAL_RECORD.md` | Blocks Go |
| Rollback owner | Missing final sign-off | Must be named in `docs/RELEASE_APPROVAL_RECORD.md` | Blocks Go |
| Previous known-good deployment | Missing | Required by observability release gate | Blocks Go |

## External review evidence

| Evidence | Status | Attached evidence / location | Release decision impact |
| --- | --- | --- | --- |
| External security review / pentest | **Open / not started** | `docs/security/evidence/runtime/external-security-review-or-pentest.json` | **P0 enterprise blocker** |
| Critical/high findings triage | Missing | No real report or triage exists | Blocks enterprise/public production |
| Retest evidence | Missing | No report or retest record exists | Blocks enterprise |

## Exceptions

These exceptions document current gaps. They are **not release approvals** and do not permit public production or enterprise Go.

| Area | Exception | Owner | Expiry date | Mitigation | Release impact |
| --- | --- | --- | --- | --- | --- |
| CI/build | Full validation command logs are missing; Vercel status is failure | Engineering / Platform owner: @renansilva2002 / renanescola40-afk | 2026-06-23 | Run full command chain in CI, attach logs and successful deployment URL | P0 blocker |
| RLS live | Supabase live tenant-isolation validation is Open/not run | Security owner: @renansilva2002 / renanescola40-afk | 2026-06-25 | Run live validation against target project and update runtime evidence | P0 blocker |
| External review | External review/pentest evidence is Open/not started | Security owner: @renansilva2002 / renanescola40-afk | 2026-07-06 | Complete third-party review or formal external review package with triage/retest | P0 enterprise blocker |
| Deployment | Successful deployment URL and previous known-good deployment are missing | Platform owner: @renansilva2002 / renanescola40-afk | 2026-06-23 | Restore Vercel build capacity, deploy assessed commit, attach build/deployment logs | P0 blocker |
| Stripe execution | Closed for billing implementation evidence; CI artifact still recommended for release archive | Billing owner: @renansilva2002 / renanescola40-afk | 2026-06-24 | Preserve output from `node scripts/security/run-stripe-runtime-validation.mjs` and focused billing tests in CI | Resolved for paid-production billing gate |
| Step-up provider | Real MFA/IdP provider execution is not attached | Security owner: @renansilva2002 / renanescola40-afk | 2026-06-25 | Run runtime preflight with real Supabase MFA or IdP claims | P0 enterprise blocker |
| Observability owners | Incident, rollback, support/customer communication owners are not signed | Release owner: @renansilva2002 / renanescola40-afk | 2026-06-23 | Fill approval record and attach runbook owner acknowledgements | P0 blocker |

## Release decision

**Final decision: No-Go.**

Rationale: public production and enterprise releases remain blocked by missing CI/build/deployment evidence, open Supabase live RLS validation, missing external review evidence, missing owner sign-off and missing preserved command outputs. Stripe paid-production billing implementation evidence is now marked Complete/passed, but do not represent the overall release as enterprise-ready until `docs/RELEASE_FINAL_READINESS_REPORT.md` is updated with all P0 items closed.
