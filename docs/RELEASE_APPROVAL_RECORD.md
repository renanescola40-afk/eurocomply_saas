# Release Approval Record

This document is the release owner record used to approve or reject a EuroComply release candidate. It records only evidence that has been observed or explicitly marked as missing; it must not be used to infer approval from incomplete data.

## Release identity

- Release name: EuroComply Operational Release Candidate - 2026-06-23
- Commit SHA: `32f4617ca43b6cc124605f9a486dd716e5e91c10` (remediation branch head before this document refresh)
- Date: 2026-06-23
- Release owner: @renansilva2002 / renanescola40-afk
- Incident owner: @renansilva2002 / renanescola40-afk (acting CTO / Security Lead)
- Rollback owner: @renansilva2002 / renanescola40-afk (acting Release Manager)
- Customer communication owner: @renansilva2002 / renanescola40-afk (acting Release Manager)
- Support owner: @renansilva2002 / renanescola40-afk (acting Release Manager)
- Security owner: @renansilva2002 / renanescola40-afk
- Approver: Not granted; blocked by open P0 evidence and non-passing final validation bundle
- Target environment: Production / enterprise candidate
- Deployment URL: `https://eurocomply-saas-git-coverage1-renanescola40-afks-projects.vercel.app` (observed from Vercel bot on PR #344 for head commit `b546847c803ed568371571c1854e13536f5cad27`; runtime reachability was not verified from this remediation environment)
- CI run URL: No GitHub Actions run observed for merge commit `a0a4849739492133b296962d40036ba1423ab831`; final validation bundle in `release-validation/` is non-passing and records commands as blocked/not run
- Build log URL: `https://vercel.com/renanescola40-afks-projects/eurocomply-saas/FVPS9rK98r8ysiXPo8MR1UATF653` (Vercel status context `success` observed for merge commit `a0a4849739492133b296962d40036ba1423ab831`)
- Decision report: `docs/RELEASE_FINAL_READINESS_REPORT.md`
- Final validation bundle: `release-validation/summary.json`, `release-validation/summary.md`, `release-validation/logs/*.log`

## Required checks

The release owner must confirm each item before approval.

### Governance gates

| Gate | Status | Evidence / note |
| --- | --- | --- |
| Release readiness command completed | **Blocked / not passing** | `release-validation/summary.json` records `npm run release:readiness` as `blocked_not_run` |
| Enterprise readiness command completed | **Blocked / not passing** | `release-validation/summary.json` records `npm run release:enterprise-readiness` as `blocked_not_run`; the runner script now includes this command |
| Release evidence checklist completed | Partial | No-Go evidence map exists; live runtime evidence remains open |
| Exceptions have owner and expiration date | Complete for No-Go tracking | Exceptions below have owner and expiry date |
| Incident owner named | Assigned | @renansilva2002 / renanescola40-afk |
| Rollback owner named | Assigned | @renansilva2002 / renanescola40-afk |
| Customer communication owner named | Assigned | @renansilva2002 / renanescola40-afk |
| Support owner named | Assigned | @renansilva2002 / renanescola40-afk |
| Approver assigned | **Not approved** | Approval is intentionally withheld while P0 blockers remain open |

### Build, deploy, and CI

| Gate | Status | Evidence / note |
| --- | --- | --- |
| `npm ci` | **Blocked / not run in final bundle** | `release-validation/logs/01-npm-ci.log` |
| `npm run lint` | **Blocked / not run in final bundle** | `release-validation/logs/02-lint.log` |
| `npm run typecheck` | **Blocked / not run in final bundle** | `release-validation/logs/03-typecheck.log` |
| `npm run test` | **Blocked / not run in final bundle** | `release-validation/logs/04-test.log` |
| `npm run test:e2e` | **Blocked / not run in final bundle** | `release-validation/logs/05-test-e2e.log` |
| `npm run build` | **Blocked / not run in final bundle** | Vercel status success observed separately for merge commit `a0a4849739492133b296962d40036ba1423ab831`; no local/CI final bundle build pass is claimed |
| `npm run security:ci` | **Blocked / not run in final bundle** | `release-validation/logs/07-security-ci.log` |
| `npm run release:readiness` | **Blocked / not run in final bundle** | `release-validation/logs/08-release-readiness.log` |
| `npm run release:enterprise-readiness` | **Blocked / not run in final bundle** | `release-validation/logs/09-release-enterprise-readiness.log` |
| `node scripts/release/run-final-validation.mjs` | **Blocked / not run in final bundle** | `release-validation/logs/10-final-validation-runner.log` |
| Vercel build/deploy status | Improved from prior failure | GitHub commit status for `a0a4849739492133b296962d40036ba1423ab831` shows `Vercel = success` and build log URL above |
| Deployment URL attached | Partial | Preview URL observed from PR #344; functional runtime verification still required before Go |

### Runtime/security gates

| Gate | Status | Evidence / note |
| --- | --- | --- |
| Supabase live RLS validation reviewed | **Open** | `docs/security/evidence/runtime/supabase-live-rls-validation.json` still requires a real target-environment run |
| External security review or pentest status reviewed | **Open / not started** | `docs/security/evidence/runtime/external-security-review-or-pentest.json` cannot be treated as complete without a real report |
| Step-up MFA / IdP validation | Exception / enterprise-blocking | Repository evidence exists; live provider execution remains missing |
| Upload scanner provider proof | Exception / enterprise-blocking | Repository evidence exists; live provider proof remains missing |
| Stripe runtime validation | Exception / production-blocking for paid launch | Focused Stripe checkout/portal/webhook runtime evidence remains pending |
| Observability and incident readiness | Partial | Named owners are assigned; target runtime verification and drill evidence remain pending |

## Rollback target

Rollback is **defined for remediation tracking only** and is not approved for production until the target is verified as working.

| Field | Value |
| --- | --- |
| Previous known-good deployment URL candidate | `https://eurocomply-saas-git-sync-rel-44736d-renanescola40-afks-projects.vercel.app` |
| Previous known-good commit SHA candidate | `94de2eb12baa2573ebc442e1f9cc8f6292e7869a` |
| Previous deployment build log | `https://vercel.com/renanescola40-afks-projects/eurocomply-saas/CtGUPmcEvL1P6QhAC6qQXsd52wMB` |
| Evidence source | PR #343 Vercel bot preview URL plus GitHub commit status `Vercel = success` for commit `94de2eb12baa2573ebc442e1f9cc8f6292e7869a` |
| Verification status | Candidate only; runtime URL was not functionally verified from this remediation environment |
| Rollback trigger criteria | Roll back or disable release if deployment health endpoint fails twice within 10 minutes, Vercel deployment fails, SEV-1/SEV-2 customer-impacting errors exceed agreed threshold, auth/session/RLS isolation checks fail, Stripe webhook signature/idempotency fails, or upload scanning enters fail-open/unknown state |
| Rollback owner | @renansilva2002 / renanescola40-afk (acting Release Manager) |
| Incident owner | @renansilva2002 / renanescola40-afk (acting CTO / Security Lead) |
| Database rollback/forward-fix strategy | Prefer forward-fix migration for Supabase. Do not run destructive rollback until PITR/export status is confirmed, migration impact is reviewed, and tenant isolation/audit-chain checks are rerun. If data correction is required, use an additive migration or compensating script with audit log preservation. |
| Stripe rollback strategy | Preserve webhook idempotency keys and event replay safety. Do not rotate webhook secrets during rollback without updating both Vercel and Stripe and rerunning webhook signature tests. |
| Customer communication owner | @renansilva2002 / renanescola40-afk (acting Release Manager) |

## Approval decision

- [ ] Private Beta Go
- [ ] Public Production Go
- [ ] Enterprise Pilot Go
- [ ] Enterprise Procurement Go
- [ ] Conditional Go
- [x] **No-Go**

## Decision

**No-Go.**

The release has improved operational evidence because a Vercel success status and deployment URL are now recorded, owners are named, the rollback target candidate is documented, and a final validation bundle exists. It is still not Go-ready because the bundle is non-passing, runtime URL verification is incomplete, and P0 runtime/security evidence remains open.

## Exceptions

These exceptions are documented for remediation tracking only. They are not approval to ship.

| Area | Exception | Owner | Expiration | Mitigation |
| --- | --- | --- | --- | --- |
| Final validation | Requested commands were not executed successfully in the final bundle | @renansilva2002 / renanescola40-afk | 2026-06-23 | Run `node scripts/release/run-final-validation.mjs` in GitHub Actions or a connected release runner and attach passing logs |
| Runtime URL verification | Deployment URL is recorded but not functionally verified here | @renansilva2002 / renanescola40-afk | 2026-06-23 | Verify `/api/health` and application smoke checks against the deployment URL |
| RLS live validation | Supabase live RLS validation is Open/not run | @renansilva2002 / renanescola40-afk | 2026-06-25 | Run `scripts/security/run-supabase-live-tenant-isolation.mjs --update-register` against target project and attach output |
| External review | External review/pentest is Open/not started | @renansilva2002 / renanescola40-afk | 2026-07-06 | Complete real external review/pentest, triage findings, attach retest/risk acceptance evidence |
| Stripe execution | Stripe evidence is implementation-complete but focused runtime execution is pending | @renansilva2002 / renanescola40-afk | 2026-06-24 | Run focused Stripe tests and webhook gates in CI and attach logs |
| Step-up runtime | Real Supabase MFA / enterprise IdP runtime proof is missing | @renansilva2002 / renanescola40-afk | 2026-06-25 | Run runtime preflight with real provider configuration and attach redacted output |
| Rollback verification | Rollback target is a candidate and not functionally verified | @renansilva2002 / renanescola40-afk | 2026-06-23 | Verify previous deployment URL, run rollback dry-run, and attach evidence |

## Final sign-off

- Release owner: @renansilva2002 / renanescola40-afk
- Incident owner: @renansilva2002 / renanescola40-afk (acting CTO / Security Lead)
- Rollback owner: @renansilva2002 / renanescola40-afk (acting Release Manager)
- Customer communication owner: @renansilva2002 / renanescola40-afk (acting Release Manager)
- Support owner: @renansilva2002 / renanescola40-afk (acting Release Manager)
- Security owner: @renansilva2002 / renanescola40-afk
- Approver: Not granted; blocked by open P0 evidence
- Date: 2026-06-23
- Notes: Release remains blocked by non-passing final validation bundle, open RLS live validation, missing external review, missing live provider evidence for enterprise MFA/IdP and upload scanning, pending focused Stripe runtime execution, and unverified rollback target/runtime URL.
