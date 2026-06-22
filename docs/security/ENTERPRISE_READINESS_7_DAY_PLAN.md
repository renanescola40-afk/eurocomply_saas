# EuroComply 7-Day Enterprise Readiness Release Plan

Date: 2026-06-22
Release owner: renan silva
Operating mode: one risk area per pull request, no fabricated evidence, no bypasses, and no `Complete` status without real validation.

## Release rules

- Every risk area is delivered as a separate PR with tests, documentation, and evidence updates where real evidence exists.
- P0 blocks public production and enterprise release.
- CI failures must be fixed or converted into formal release exceptions only when the affected release target is downgraded accordingly.
- External pentest, SOC 2, ISO 27001, or equivalent certifications must not be claimed unless actual third-party evidence exists.
- Value-bearing secrets, screenshots, provider exports, customer data, and access tokens must stay outside the repository.

## Pull request execution order

| Order | Day | PR | Scope | Probable files | Primary risks | Validation commands |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | API security hardening | Migrate remaining high-risk API routes to central auth/RBAC/origin/rate-limit/sanitized-error helpers. | `src/app/api/**/route.ts`, `src/server/security/api-guards.ts`, `tests/security/**`, `docs/security/API_SECURITY_MODEL.md` | Regression in billing/team/GDPR flows; missing tenant guard; unsanitized errors. | `npm run test -- tests/security/billing-checkout-hardening.test.ts`, `npm run security:api-guards`, `npm run security:api-endpoints`, `npm run typecheck` |
| 2 | 1 | Secrets readiness | Verify `.env.example`, provider variable inventory, server-only boundaries, and redacted evidence. | `.env.example`, `scripts/security/check-production-secret-readiness.mjs`, `docs/security/P0_PRODUCTION_SECRETS_EVIDENCE_RUNBOOK.md`, `docs/security/evidence/runtime/production-secrets-provider-stores.json` | Accidentally committing values; marking provider readiness without private evidence. | `npm run security:public-secrets`, `npm run security:production-secrets`, `npm run security:client-boundaries` |
| 3 | 1 | CI/CD full security suite | Ensure full suite gates are present, fail closed, upload diagnostics only, and match branch protection evidence. | `.github/workflows/full-security-suite.yml`, `.github/workflows/security-ci.yml`, `.github/workflows/secret-scanning.yml`, `scripts/security/check-github-security-workflows.mjs`, `docs/security/CI_CD_BRANCH_PROTECTION.md` | CI cost/time; required checks mismatching GitHub branch protection; accidental secret printing. | `npm run security:github-workflows`, `npm run security:ci-cd`, `actionlint`, full GitHub Actions run |
| 4 | 2 | Supabase RLS live validation | Run live RLS preflight and capture redacted runtime result. | `scripts/security/run-supabase-live-tenant-isolation.mjs`, `tests/security/supabase-live-rls-evidence.test.mjs`, `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` | Using service role instead of user-session paths; false positives from seeded data. | `npm run security:rls`, `npm run security:rls:live` |
| 5 | 2 | Tenant isolation tests | Expand tenant-isolation contract tests for sensitive reads/writes. | `tests/security/tenant-query-isolation.test.mjs`, `src/server/queries/**`, `supabase/migrations/**` | Test-only tenant checks that do not map to runtime paths. | `npm run test -- tests/security/tenant-query-isolation.test.mjs`, `npm run security:authorization-bola` |
| 6 | 2 | P0 runtime evidence | Update evidence register only from live validated runtime artifacts. | `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md`, `docs/security/evidence/runtime/*.json` | Claiming Complete without private proof; stale commit SHA. | `npm run security:release-evidence`, `npm run security:final-readiness` |
| 7 | 3 | Stripe billing hardening | Harden checkout, portal, webhook, price mapping, and return URLs. | `src/app/api/billing/**`, `src/app/api/stripe/webhook/**`, `src/server/billing/**`, `tests/security/**`, `docs/security/BILLING_RETURN_URLS.md` | Webhook replay/signature mistakes; customer/org mismatch; bad return URL. | `npm run security:billing-webhook-body`, `npm run test -- tests/security/*billing*`, `npm run security:api-guards` |
| 8 | 3 | Audit-chain validation | Verify append-only chain, signing secret readiness, and critical event coverage. | `src/server/queries/audit-events*`, `scripts/security/check-audit-chain.mjs`, `scripts/security/check-audit-critical-coverage.mjs`, `docs/security/AUDIT_CHAIN.md` | Broken hash continuity; unsigned exports; insufficient high-risk coverage. | `npm run security:audit-chain`, `npm run test -- tests/**/*audit*` |
| 9 | 3 | Rate limiting | Enforce distributed fail-closed rate limits for high-risk public/mutating routes. | `src/lib/security/rate-limit*`, `src/server/security/rate-limit*`, `tests/unit/rate-limit.test.ts`, `docs/security/API_SECURITY_MODEL.md` | Local in-memory behavior hiding production Redis gaps; excessive false positives. | `npm run test -- tests/unit/rate-limit.test.ts`, `npm run security:api-guards`, `npm run security:production-secrets` |
| 10 | 4 | Real step-up/MFA | Validate challenge signing, expiry, replay resistance, and sensitive-action enforcement. | `src/server/security/step-up.ts`, `src/app/api/security/step-up/**`, `tests/security/**step-up**`, `docs/security/STEP_UP_AUTH.md` | UX lockout; weak bypass on protected mutations; missing signing secret. | `node scripts/security/check-step-up.mjs`, `npm run test -- tests/**/*step-up*` |
| 11 | 4 | Upload malware scanning fail-closed | Require real scanner provider for enterprise uploads; block when scanner unavailable. | `src/lib/documents/upload*`, `src/app/api/**upload**`, `scripts/security/check-upload-content-scan.mjs`, `.env.example`, `docs/security/evidence/runtime/upload-malware-scan-validation.json` | Fail-open upload path; scanner timeout regressions; fake provider evidence. | `npm run security:upload`, `npm run security:upload-content-scan`, `npm run test -- tests/**/*upload*` |
| 12 | 5 | E2E route health | Validate public/protected route status, redirects, and no accidental 500s. | `tests/e2e/route-health.spec.ts`, `scripts/quality/check-route-health-artifacts.mjs`, `docs/security/evidence/runtime/route-health*.json` | Environment-specific false positives; test user/session setup drift. | `npm run quality:routes`, `npm run quality:routes:e2e` |
| 13 | 5 | Frontend enterprise UX | Improve trust surfaces, empty states, billing/security UX, and error messaging. | `src/app/**`, `src/components/**`, `messages/**`, `tests/e2e/**` | Cosmetic-only changes hiding missing controls; broken localization. | `npm run lint`, `npm run typecheck`, `npm run test:e2e` |
| 14 | 5 | Performance/reliability | Remove obvious slow paths, add timeouts, and validate build/runtime budgets. | `src/server/**`, `src/lib/**`, `next.config.*`, `docs/ops/**` | Over-optimizing without telemetry; caching sensitive no-store responses. | `npm run build`, `npm run security:no-store`, targeted load/smoke evidence |
| 15 | 6 | Observability | Wire structured logs, Sentry readiness, health/ready checks, and redaction controls. | `src/lib/observability*`, `src/app/api/ready/**`, `.env.example`, `tests/unit/observability.test.ts`, `docs/ops/**` | PII/secrets in logs; missing alert routing; false health positives. | `npm run test -- tests/unit/observability.test.ts`, `npm run security:logs`, `npm run security:ops-readiness` |
| 16 | 6 | Incident response | Publish response process, severity matrix, roles, rollback, and post-incident template. | `docs/ops/**`, `scripts/security/check-release-incident-response.mjs`, `scripts/security/check-release-post-incident.mjs` | Process-only evidence without owner acceptance; unclear escalation. | `npm run security:release-incident-response`, `npm run security:release-post-incident` |
| 17 | 6 | GDPR/privacy | Validate data subject flows, privacy docs, data flow, deletion request security. | `src/app/api/gdpr/**`, `docs/privacy/**`, `docs/security/**GDPR**`, `scripts/security/**gdpr**` | Deletion without ownership proof; unreviewed subprocessors; incomplete data map. | `npm run security:api-guards`, `npm run security:release-support-readiness`, GDPR route tests |
| 18 | 6 | Trust Center | Publish evidence index with honest statuses and no certification claims. | `src/app/**trust**`, `docs/security/TRUST_CENTER.md`, `scripts/security/check-trust-package.mjs`, `scripts/security/check-enterprise-trust-evidence.mjs` | Overclaiming SOC2/ISO/pentest; exposing sensitive evidence. | `npm run security:trust-package`, `npm run security:trust-evidence`, content review |
| 19 | 7 | Full validation | Run complete CI/security/release suite and collect outputs. | GitHub Actions, `docs/security/evidence/runtime/**`, `final-security-readiness.json` | Local-only validation; ignoring flaky fail-closed controls. | `npm run lint && npm run typecheck && npm run test && npm run build && npm run security:ci && npm run release:readiness` |
| 20 | 7 | Evidence package | Assemble redacted evidence bundle with hashes and private evidence pointers. | `docs/security/evidence/**`, `docs/RELEASE_EVIDENCE_CHECKLIST.md`, `scripts/security/check-release-evidence.mjs` | Evidence drift; value-bearing files in repo; stale commit SHA. | `npm run security:release-evidence`, `npm run security:trust-evidence` |
| 21 | 7 | Release approval | Owner acceptance, exception review, target environment approval, and rollback sign-off. | `docs/security/RELEASE_APPROVAL.md`, `docs/security/ENTERPRISE_READINESS_EXCEPTIONS.md`, GitHub environment approval | Rubber-stamp approval; missing P0 exception owner/expiry. | `npm run security:release-approval`, `npm run security:release-rollback` |
| 22 | 7 | Go/No-Go | Final public/enterprise decision based on P0 status and validated evidence. | `docs/security/GO_NO_GO.md`, `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md`, `final-security-readiness.json` | Shipping with unresolved P0; ambiguous release target. | `npm run security:release-go-no-go`, `npm run release:enterprise-readiness` |

## P0 exception format

Use this exact format when a control cannot be completed inside the 7-day window:

```text
Exception ID: EX-YYYYMMDD-NN
Owner: named accountable owner
Severity: P0 | P1 | P2
Affected release target: public production | enterprise | private beta | internal only
Control gap: concrete missing control or evidence
Mitigation: concrete compensating control
Expiry date: YYYY-MM-DD
Release decision impact: e.g. blocks public/enterprise; allowed only for private beta
Evidence location: link/path to redacted evidence or private evidence pointer
Approval: release owner + security owner
```

## Initial release exceptions

### EX-20260622-01 — External security review not complete

- Owner: Release Manager / Security Lead — renan silva
- Severity: P0 for enterprise and public production
- Affected release target: public production and enterprise procurement
- Control gap: no completed external security review or pentest evidence is present in the repository.
- Mitigation: do not claim pentest, SOC 2, ISO 27001, or external certification; restrict release to internal/private beta until external review is completed or separately approved.
- Expiry date: 2026-07-22 or before any public/enterprise release, whichever is earlier.
- Release decision impact: blocks public production and enterprise release.
- Evidence location: `docs/security/P0_EXTERNAL_REVIEW_EVIDENCE_RUNBOOK.md` and private reviewer evidence when obtained.
- Approval: pending release-owner sign-off.
