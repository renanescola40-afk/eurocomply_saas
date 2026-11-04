# CircleCI Free A-15 source-quality attempt — 2026-11-02

## Scope and authorization

Single controlled Docker Medium CircleCI quality pipeline in isolated branch `ci/circleci-gh-actions-one-shot-20261102`, based on the previously passed CircleCI #740 smoke branch SHA `2673a3b12e00f3a332079562cd612a3dfdfcede3`. User authorized continuation of safe no-new-cost CI after confirming Free credits remaining.

## Test lanes

- Checkout exact `CIRCLE_SHA1`; reject any other branch or privileged provider credentials.
- Node.js 22, `npm ci --ignore-scripts --no-audit --no-fund`.
- `security:package-lock` and offline `run-security-ci-without-audit.mjs`.
- ESLint, TypeScript, `npm run test`, Next.js build using non-production placeholders.

This branch deliberately replaces the temporary one-shot smoke workflow with exactly one branch-scoped quality workflow so the same push does not duplicate smoke-credit consumption.

## Acceptance and limits

This is a **source-quality evidence attempt**, not formal QAT-01 PASS. The formal A-15 gate needs complete required security coverage, independent review and exact candidate SHA. CodeQL/Gitleaks/provider-backed security run separately and are not waived. A successful CircleCI run here must not authorize merge or production deployment. No paid CI, Stripe LIVE writes, emails, production writes or changes to GitHub billing are authorized.

If the pipeline is blocked or fails: capture check context + the first failing step; do not retrigger blindly. No automatic rerun. Keep root PR #2592 and main unchanged.
