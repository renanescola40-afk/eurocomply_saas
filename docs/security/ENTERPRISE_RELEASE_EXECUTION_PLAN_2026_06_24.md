# EuroComply Enterprise Release Execution Plan — 2026-06-24

Release mode: **No-Go until proven otherwise**.

This plan is the working execution order for the one-week enterprise-readiness push. It is intentionally evidence-driven: no item can move to `Complete` from documentation alone, provider screenshots alone, or a historical deployment URL that does not match the assessed commit.

## Operating rules

- Each risk area is delivered in a separate pull request.
- P0 items are closed before P1/P2 scope.
- Every PR includes tests and documentation.
- Runtime or provider-dependent PRs include redacted evidence or explicitly remain blocked.
- External security review, pentest, SOC 2, ISO 27001, or equivalent claims are not made without real third-party evidence.
- CI is never bypassed to manufacture readiness.
- Formal exceptions require owner, severity, affected release target, mitigation, expiry date, evidence location, and release-decision impact.
- Conditional Go cannot bypass tenant isolation, RLS, RBAC, billing integrity, audit-chain integrity, customer data protection, upload fail-closed behavior, real MFA/IdP proof, or external enterprise review.

## Exact pull request order

| Order | Day | PR | Scope | Probable files | Risks | Validation commands | Merge criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | Deployment, final validation, owners, rollback control plane | Re-establish Vercel deployability path, final validation bundle workflow, approval owners, rollback target, and explicit No-Go gates for missing deployment URL. | `.github/workflows/release-final-validation.yml`, `scripts/release/run-final-validation.mjs`, `scripts/release/check-day1-release-control-plane.mjs`, `docs/RELEASE_APPROVAL_RECORD.md`, `docs/RELEASE_FINAL_READINESS_REPORT.md`, `docs/RELEASE_GO_NO_GO_CHECKLIST.md`, `docs/ops/VERCEL_DEPLOYMENT_RECOVERY_RUNBOOK.md`, `release-validation/**` | Treating historical Vercel URL as current proof; marking Go while final validation fails; rollback target not verified. | `npm run test -- tests/release-day1-control-plane-smoke.test.ts`; `node scripts/release/check-day1-release-control-plane.mjs`; manual `RELEASE_TARGET=enterprise node scripts/release/run-final-validation.mjs` when a runner is available. | PR may merge only if the repo-side control-plane smoke test passes, owners are named, rollback is documented as candidate/not verified, final validation workflow uploads artifacts, and release remains No-Go unless current deployment URL and bundle are truly passing. |
| 2 | 2 | Supabase RLS live validation | Run target-environment live RLS validation and update evidence register from script output. | `scripts/security/run-supabase-live-tenant-isolation.mjs`, `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md`, `docs/security/evidence/runtime/supabase-live-rls-validation.json`, `tests/security/**rls**` | False positive from service-role path; tenant A/B data contamination; stale project URL. | `npm run security:rls:live`; `npm run security:rls`; `npm run security:release-evidence`. | `supabase-live-rls-validation.json` is `Complete/passed` for target environment, tenant A/B isolation is proven, and P0 register is updated without manual status inflation. |
| 3 | 3 | API hardening, BOLA/IDOR, rate limit, security CI | Harden sensitive API routes, add/expand BOLA/IDOR tests, require rate limiting and security CI gates. | `src/app/api/**/route.ts`, `src/server/security/**`, `src/lib/security/rate-limit*`, `tests/security/**`, `.github/workflows/security-ci.yml`, `docs/security/API_SECURITY_MODEL.md` | RBAC regression, fail-open rate limiting, sanitized-error gaps, security CI too slow or incomplete. | `npm run security:api-guards`; `npm run security:api-endpoints`; `npm run security:authorization-bola`; `npm run test -- tests/security`; `npm run typecheck`. | No high-risk route lacks auth/RBAC/origin/rate-limit/error controls; BOLA/IDOR tests cover sensitive object access; CI gate is green. |
| 4 | 4 | Stripe, MFA/IdP, upload scanner runtime proof | Run paid-flow/runtime evidence for Stripe, real provider proof for MFA/IdP, and fail-closed upload scanner validation. | `src/app/api/billing/**`, `src/app/api/stripe/**`, `scripts/security/run-step-up-mfa-runtime-validation.mjs`, `scripts/security/run-upload-scanner-runtime-validation.mjs`, `docs/security/evidence/runtime/**` | Fake provider evidence; webhook replay/signature gaps; upload scanner fail-open; IdP/MFA proof not tied to runtime. | `npm run security:billing-webhook-body`; `npm run test -- tests/**/*billing*`; `npm run security:step-up:runtime`; `npm run security:upload-scanner:runtime`; `npm run security:upload-content-scan`. | Stripe checkout/portal/webhook evidence is attached; MFA/IdP runtime proof is redacted but real; upload scanning proves fail-closed behavior. |
| 5 | 5 | Audit-chain, observability, incident response, rollback, support communications | Validate audit-chain live behavior, health/readiness, incident workflows, rollback dry-run, and customer/support communications. | `src/server/queries/audit-events*`, `scripts/security/check-audit-chain.mjs`, `docs/ops/**`, `docs/RELEASE_INCIDENT_RESPONSE_PLAN.md`, `docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md`, `docs/RELEASE_APPROVAL_RECORD.md` | Non-transactional audit append, alert gaps, ambiguous rollback trigger, no communication owner. | `npm run security:audit-chain`; `npm run security:logs`; `npm run security:ops-readiness`; `npm run security:release-incident-response`; `npm run security:release-rollback`; `npm run security:release-support-readiness`. | Audit-chain checks pass; alerts/health/readiness are validated; rollback dry-run is evidenced; owner sign-off is explicit. |
| 6 | 6 | E2E route health, production smoke, enterprise UX, Trust Center, privacy/GDPR | Validate route health and production smoke, improve enterprise UX/trust surfaces, and verify privacy/GDPR readiness. | `tests/e2e/**`, `scripts/quality/**`, `src/app/**`, `src/components/**`, `messages/**`, `docs/security/TRUST_CENTER.md`, `docs/privacy/**` | Cosmetic changes masking missing controls; broken localization; Trust Center overclaims; GDPR ownership gaps. | `npm run quality:routes`; `npm run quality:routes:e2e`; `npm run test:e2e`; `npm run security:trust-package`; `npm run security:trust-evidence`; `npm run typecheck`. | No accidental 500s; protected routes behave correctly; Trust Center has honest statuses; privacy/GDPR docs and flows are reviewed. |
| 7 | 7 | External review package, final readiness, Go/No-Go | Package external review materials, run complete validation, finalize release decision. | `docs/security/PENTEST_SCOPE.md`, `docs/security/PRE_PENTEST_CHECKLIST.md`, `docs/security/PENTEST_FINDINGS_TRIAGE.md`, `docs/security/PENTEST_RETEST_RECORD.md`, `docs/RELEASE_FINAL_READINESS_REPORT.md`, `docs/RELEASE_APPROVAL_RECORD.md`, `final-security-readiness.json`, `release-validation/**` | Inventing pentest status; shipping with open P0; treating Conditional Go as blanket waiver. | `npm run lint`; `npm run typecheck`; `npm run test`; `npm run test:e2e`; `npm run build`; `npm run security:ci`; `npm run release:readiness`; `npm run release:enterprise-readiness`. | Go only if all P0 gates are complete with real evidence. Otherwise No-Go or downgraded release target with formal exceptions. |

## Day 1 PR implementation notes

The Day 1 PR does **not** claim that Vercel has produced a current deployment URL. A repo change cannot buy Vercel quota, access the project dashboard, or prove a provider-side deployment. The PR creates the repeatable control plane needed to obtain and validate that evidence once Vercel capacity exists.

Required Day 1 evidence before any Go decision:

1. Current assessed commit SHA.
2. Current Vercel deployment URL for that commit.
3. Current Vercel build/deploy log URL.
4. `/api/health` result for the deployment URL.
5. Protected `/api/ready` result using the correct runtime credentials.
6. `release-validation/summary.json`, `summary.md`, and command logs from `node scripts/release/run-final-validation.mjs`.
7. Rollback target URL/SHA verified from the target environment, not just a historical bot comment.

## Merge criteria common to all PRs

- Tests pass for the PR-specific validation scope.
- Documentation names the exact evidence path and owner.
- Any missing runtime evidence is recorded as blocking, not hidden.
- No P0 is downgraded without a formal exception.
- No new secret value, provider token, customer data, screenshot with sensitive data, or billing payload with live identifiers is committed.

## Go / No-Go definition

### Go

A release can be marked Go only when all of the following are true for the promoted commit:

- Current deployment URL and build log exist for the exact commit under assessment.
- `npm ci`, lint, typecheck, tests, E2E, build, security CI, release readiness, and enterprise readiness have passing logs.
- Supabase RLS live validation is `Complete/passed` for the target environment.
- Tenant isolation, RBAC, billing integrity, audit-chain integrity, upload fail-closed behavior, customer data protection, and real MFA/IdP proof are validated.
- Stripe runtime/webhook evidence is complete for paid production.
- External security review is complete for enterprise release, with findings triaged and critical/high findings resolved or formally accepted with retest/risk evidence.
- Rollback target is verified and rollback owner has signed off.
- Approval record has named release, security, incident, rollback, support, and customer communication owners.

### No-Go

The release is No-Go if any P0 is open, missing, failed, stale, contradicted, or not tied to the promoted commit. As of this plan, the known No-Go blockers are current deployment URL/final validation evidence, Supabase RLS live validation, external review/pentest, MFA/IdP runtime proof, upload scanner live fail-closed proof, Stripe runtime evidence, and rollback final verification.
