# Release Approval Record

This document is the release owner record used to approve or reject a RISCK COMPLY release candidate. It records observed evidence only. It must not infer approval from incomplete runtime proof.

## Release identity

- Release name: RISCK COMPLY Enterprise Production Final Gate
- Date: 2026-07-10
- Repository: `renanescola40-afk/eurocomply_saas`
- Evidence update branch: `main`
- Target environment: Production / enterprise candidate
- Release owner: @renansilva2002 / renanescola40-afk
- Incident owner: @renansilva2002 / renanescola40-afk
- Rollback owner: @renansilva2002 / renanescola40-afk
- Customer communication owner: @renansilva2002 / renanescola40-afk
- Support owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Escalation path: Support owner -> Incident owner -> Rollback owner -> Security owner -> Release owner / Approver
- Approver: **Not granted**; blocked by open P0 runtime evidence and missing final validation runner proof.
- Final decision: **No-Go**

## Status page and customer communication timing

- SEV-1: declare within 5 minutes, assign incident owner immediately, first customer/status update within 15 minutes after impact is confirmed, follow-up every 30 minutes, post-incident review started within 24 hours.
- SEV-2: declare within 15 minutes, assign incident owner within 15 minutes, first customer/status update within 30 minutes when customer-visible, follow-up every 60 minutes, post-incident review started within 2 business days.
- Status page decision: required for confirmed SEV-1 customer impact and customer-visible SEV-2 incidents lasting more than 30 minutes.
- Customer updates must not include secrets, stack traces, exploit detail, raw logs, cookies, tokens, DSNs, internal URLs or customer PII.

## Exceptions

No Enterprise Production Go exceptions are approved.

A Conditional Go exception may only be considered for a controlled beta/private pilot when all of the following are recorded before customer exposure:

- exception owner;
- affected control/evidence item;
- customer impact and scope limit;
- expiry date;
- rollback plan;
- monitoring plan;
- customer communication plan;
- acceptance signature from release/security owner.

Current exceptions status: **none approved for enterprise production**.

## Required checks

### Governance gates

| Gate | Status | Evidence / note |
| --- | --- | --- |
| Release readiness command completed | **Not proven passed** | `npm run release:production-final` must pass for the promoted commit. |
| Enterprise runtime evidence completed | **Not proven passed** | `docs/security/evidence/runtime/enterprise-runtime-evidence.json` must be Complete/passed. |
| Final Go/No-Go evidence completed | **Not proven passed** | `docs/security/evidence/runtime/release-go-no-go.json` must be Complete/passed with `finalDecision: Go`. |
| Release approval selected | **Not approved** | Approval is intentionally withheld while P0 blockers remain open. |
| Deployment URL functional verification | **Open** | Deployment URL is candidate-only; runtime URL was not functionally verified. |
| Incident owner named | Complete | @renansilva2002 / renanescola40-afk. |
| Rollback owner named | Complete | @renansilva2002 / renanescola40-afk. |
| Support owner named | Complete | @renansilva2002 / renanescola40-afk. |
| Customer communication owner named | Complete | @renansilva2002 / renanescola40-afk. |
| Escalation path documented | Complete | Support owner -> Incident owner -> Rollback owner -> Security owner -> Release owner / Approver. |

### Build, deploy and CI

| Gate | Status | Evidence / note |
| --- | --- | --- |
| Deterministic install | **Not proven for final target run** | Final runner must execute `npm ci`. |
| Package-lock alignment | Required | `npm run security:package-lock`. |
| Lint | Required | `npm run lint`. |
| Typecheck | Required | `npm run typecheck`. |
| Unit tests | Required | `npm run test`. |
| E2E production-like | **Not proven for final target run** | `npm run test:e2e` must run and must not be silently skipped. |
| Build | Required | `npm run build`. |
| npm audit | Required | `npm audit --audit-level=moderate` / `security:ci`. |
| Security CI | Required | `npm run security:ci`. |
| Route quality | Required in workflow | `npm run quality:routes`. |
| Production release validation job | Active | `.github/workflows/enterprise-production-gate.yml`. |
| Artifacts on failure | Active | Workflow uploads runtime evidence, release-validation logs and Playwright artifacts. |

### Runtime/security gates

| Gate | Status | Evidence / note |
| --- | --- | --- |
| Production deployment smoke | **Not proven passed** | `deployment-smoke-validation.json` must be Complete/passed. |
| Health endpoint | Code-ready, runtime proof required | `/api/health` must return public redacted `status: ok`. |
| Protected readiness | Code-ready, runtime proof required | `/api/ready` must reject anonymous calls, accept `HEALTHCHECK_TOKEN`, fail closed with 503 and avoid secret leakage. |
| Supabase live RLS | **Open/failed** | Supabase RLS live validation must be Complete/passed against the correct project. |
| Stripe webhook/billing readiness | Required | `stripe-billing-validation.json` and readiness smoke. |
| Redis/rate limit readiness | Required | Protected readiness and security gates. |
| Sentry/observability readiness | Required | `observability-smoke-validation.json` Complete/passed. |
| Enterprise upload scanner | Required | `upload-malware-scan-validation.json` Complete/passed. |
| Branch protection evidence | Required | `branch-protection-required-checks.json` Complete/passed. |
| Auth/RBAC final validation | Required | `auth-rbac-final-validation.json` Complete/passed with real target proof. |
| Audit-chain live validation | Required | `audit-chain-live-validation.json` Complete/passed. |
| External security review/pentest | **Open/not_started** | External review/pentest is Open/not_started until real report proof, triage and acceptance/retest evidence are attached. |

## Deployment URL

Deployment URL: `https://www.risckcomply.com`

The candidate runtime URL must be functionally verified by `release:deployment-smoke`. This remains an explicit No-Go condition while readiness/dependency checks fail.

## Rollback target

Rollback is **not approved** until the final dry-run evidence passes.

Previous known-good deployment URL candidate: `https://www.risckcomply.com`. Functional verification and dry-run evidence must be attached by the final runner.

Rollback target is candidate-only until `rollback-dry-run-validation.json` is Complete/passed for the exact target and commit.

Rollback trigger criteria:

- Any post-deploy health/readiness failure that cannot be mitigated within the incident response window.
- Confirmed data exposure, auth/RBAC bypass, tenant isolation failure or severe billing/webhook regression.
- Failed production smoke, observability smoke or Supabase live RLS validation for the promoted commit.

Required configuration:

| Variable | Purpose |
| --- | --- |
| `RELEASE_ROLLBACK_TARGET` | Previous known-good deployment URL or deployment target. |
| `LAST_KNOWN_GOOD_DEPLOYMENT_URL` | Alternative previous known-good deployment URL. |
| `RELEASE_ROLLBACK_TARGET_SHA` | Previous known-good full commit SHA. |
| `LAST_KNOWN_GOOD_COMMIT_SHA` | Alternative previous known-good commit SHA. |
| `RELEASE_ROLLBACK_TARGET_VALIDATED=true` | Manual functional validation proof flag, only after target validation. |

Rollback must preserve Stripe idempotency/replay safety and must not run destructive Supabase rollback without incident commander and database owner approval.

## Approval decision

- [ ] Private Beta Go
- [ ] Public Production Go
- [ ] Enterprise Pilot Go
- [ ] Enterprise Procurement Go
- [ ] Conditional Go
- [x] **No-Go**

## Decision

**No-Go.**

The release gate has been hardened, but approval is withheld because the final enterprise production runner has not produced complete runtime evidence for the current promoted target and commit. Enterprise claims, enterprise procurement readiness, paid production launch and customer-facing Go messaging remain blocked.

## P0 blockers

| Area | Blocker | Owner | Required closure evidence |
| --- | --- | --- | --- |
| Final validation | Exact final command bundle not proven passed | @renansilva2002 / renanescola40-afk | `production-final-validation.json` + `final-validation-runner.json` Complete/passed |
| Deployment smoke | Health/readiness/prod smoke not verified for target | @renansilva2002 / renanescola40-afk | `deployment-smoke-validation.json` Complete/passed |
| RLS live validation | Supabase live RLS must be proven against correct project | @renansilva2002 / renanescola40-afk | `supabase-live-rls-validation.json` Complete/passed |
| Branch protection | Required checks on `main` not proven for final gate | @renansilva2002 / renanescola40-afk | `branch-protection-required-checks.json` Complete/passed |
| External review | External review/pentest proof not approved as real evidence | @renansilva2002 / renanescola40-afk | Real report reference, triage and retest/acceptance evidence |
| Final Go/No-Go | Enterprise runtime and final Go/No-Go evidence absent/not passed | @renansilva2002 / renanescola40-afk | `enterprise-runtime-evidence.json` and `release-go-no-go.json` Complete/passed |

## Final sign-off

- Release owner: @renansilva2002 / renanescola40-afk
- Incident owner: @renansilva2002 / renanescola40-afk
- Rollback owner: @renansilva2002 / renanescola40-afk
- Customer communication owner: @renansilva2002 / renanescola40-afk
- Support owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Approver: Not granted
- Date: 2026-07-10
- Final notes: Release remains blocked. Do not present this package to customers, procurement or enterprise buyers as approved production/enterprise evidence until the final runner produces complete passing evidence.
