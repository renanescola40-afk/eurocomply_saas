# Release Readiness Commands

This document lists the commands used to validate RISCK COMPLY before promoting a build to beta, production, or enterprise review.

## Current status

As of 2026-06-29, enterprise promotion remains **No-Go** until the exact production deployment has green CI, real runtime evidence, rollback evidence, branch protection evidence, and final owner approval.

Required repository controls:

- `package-lock.json` aligned with `package.json`.
- Full Security Suite green for the exact promoted commit.
- Public exposure scanning enabled in strict fail-closed mode.
- Any high or critical npm audit finding fixed or triaged.
- Production smoke evidence generated from the real deployment URL without exposing tokens or secrets.

## Enterprise blocking CI

Every release candidate must have a green GitHub Actions run for:

```text
Full Security Suite / Enterprise merge/deploy gate
```

The Full Security Suite must run:

```bash
npm ci --ignore-scripts
npm run security:package-lock
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=moderate
npm run security:ci
npm run quality:routes
node scripts/security/check-branch-protection-evidence.mjs
```

It also runs E2E when configured, Actionlint, Gitleaks, Semgrep, CodeQL, Dependency Review, OSSF Scorecard, branch-protection evidence validation, and SBOM generation.

## Production smoke test

```bash
npm run release:deployment-smoke
```

The production smoke test is a fail-closed runtime gate. It writes `docs/security/evidence/runtime/deployment-smoke-validation.json` and must not be called passed unless every critical check succeeds.

Required environment for the smoke command:

```bash
RELEASE_DEPLOYMENT_URL="https://<production-or-preview-url>"
HEALTHCHECK_TOKEN="<protected readiness token>"
RELEASE_COMMIT_SHA="<commit being validated>"
RELEASE_BUILD_SHA="<build sha or deployment sha>"
RELEASE_ROLLBACK_TARGET="https://<last-known-good-deployment>"
```

Optional environment:

```bash
RELEASE_SMOKE_URLS="https://one.example,https://two.example"
RELEASE_SMOKE_LOCALE="pt"
RELEASE_SMOKE_TIMEOUT_MS="10000"
RELEASE_RUN_OBSERVABILITY_SMOKE="true"
```

The smoke command validates:

- Production URL is configured.
- `/api/health` returns `status: ok` and `Cache-Control: no-store`.
- `/api/ready` rejects anonymous access.
- `/api/ready` returns `status: ready` with the protected healthcheck token.
- Landing, pricing, trust, and login pages load publicly.
- Dashboard and organization dashboard require authentication and redirect to localized login.
- Protected redirects use `Cache-Control: private, no-store`.
- Security headers are present on public pages.
- Supabase, Stripe, Redis, Sentry, database connectivity, and enterprise upload scanner readiness are confirmed through grouped `/api/ready` checks.
- Secret values, authorization headers, cookies, and individual secret environment variable names are not written to evidence.
- Rollback target is configured and health-checked when it is a URL.
- Last commit and build SHA are registered in evidence.
- Observability smoke guard rejects anonymous requests; when `RELEASE_RUN_OBSERVABILITY_SMOKE=true`, it emits a real protected observability smoke event.

## Release governance

```bash
npm run release:readiness
```

This validates the release candidate governance package and does not replace the required green Full Security Suite run or the required production smoke evidence.

## Enterprise readiness

```bash
npm run release:enterprise-readiness
```

This blocks enterprise release until branch protection evidence, external review evidence, triage, and retest requirements are complete.

## Full security CI

Run `npm run security:ci` with strict public scanning enabled. This is the application security gate and must pass before public production.

It validates audit, lockfile alignment, production configuration readiness, routes, RLS checks, API guards, protected routes, client boundaries, auth token validation, authorization/BOLA controls, server action identity, security headers, no-store protections, origin guards, no-open-proxy controls, upload security, audit-chain controls, workflow governance, supply-chain controls, and trust evidence.

## Supply-chain release steps

Before calling a release enterprise-ready, collect:

```bash
npm run supply-chain:lockfile
npm run security:package-lock
npm run supply-chain:floating-deps
npm run security:npm-audit:json > npm-audit.json
node scripts/security/check-branch-protection-evidence.mjs
```

Then review and attach the generated lockfile, audit evidence, branch-protection evidence and SBOM artifact to the release package.

## Branch protection configuration evidence

If the GitHub branch protection or rulesets API is unavailable, configure the required checks manually:

```text
Settings -> Rulesets/Branches -> main -> required checks -> add every check listed in docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md
```

Do not mark branch protection evidence `Complete` without API-generated or screenshot-backed proof.

## Promotion rule

Do not promote to public production unless all of these are true:

- Full Security Suite is green for the exact commit.
- `npm run security:ci` passes with strict public scanning enabled.
- `npm run release:readiness` passes.
- `npm run release:deployment-smoke` passes against the exact deployed URL.
- Branch protection evidence validates successfully.
- Vercel build/deploy is green.
- Supabase live RLS evidence is attached.
- Audit-chain migration is applied in the target project.
- Billing/webhook checks are attached.
- SBOM artifact is attached.
- Rollback target evidence is attached.
- Any high/critical npm audit item is fixed or triaged with owner and expiry.
- Any remaining exceptions are documented with owner and expiry.

Do not promote to enterprise release unless `npm run release:enterprise-readiness` passes with real external security review evidence and branch protection evidence status is `Complete`.
