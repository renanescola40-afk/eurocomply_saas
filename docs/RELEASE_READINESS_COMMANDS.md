# Release Readiness Commands

This document lists the commands used to validate EuroComply before promoting a build to beta, public production, or enterprise review.

## Current GitHub enterprise status

As of 2026-06-25, the release status is **No-Go for enterprise** until these repository controls are complete:

- `docs/security/evidence/runtime/branch-protection-required-checks.json` is `Complete`, not `Exception` or `Open`.
- `package-lock.json` is aligned with `package.json`.
- Full Security Suite is green for the exact commit being promoted.
- Strict public secret scanning runs with `STRICT_PUBLIC_SECRET_SCAN=1` and fails on real hardcoded values.
- Any high or critical npm audit finding is fixed or triaged in `docs/security/NPM_AUDIT_TRIAGE.md`.

## Enterprise blocking CI

Every release candidate must have a green GitHub Actions run for:

```text
Full Security Suite / Enterprise merge/deploy gate
```

The Full Security Suite runs the enterprise merge/deploy blockers:

```bash
npm ci --ignore-scripts
node scripts/security/check-package-lock-alignment.mjs
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=moderate
npm run security:ci
npm run quality:routes
node scripts/security/check-branch-protection-evidence.mjs
```

It also runs E2E when Playwright is configured, Actionlint, Gitleaks, Semgrep, CodeQL, Dependency Review, OSSF Scorecard, branch-protection evidence validation, and SBOM CycloneDX generation.

A release is blocked when the Full Security Suite is not green for the exact commit being promoted.

## Fast release governance check

```bash
npm run release:readiness
```

This command validates the Release Candidate governance package:

- `security:release-candidate`
- `security:release-evidence`
- `security:external-review`

It is intentionally separate from the full CI command so release owners can check governance evidence without running the entire test suite. It does **not** replace the required green Full Security Suite run.

## Enterprise external review gate

For enterprise release, run:

```bash
npm run release:enterprise-readiness
```

This sets `RELEASE_TARGET=enterprise` and blocks release when:

- `docs/security/evidence/runtime/external-security-review-or-pentest.json` is not `Complete`.
- Any critical/high finding is neither resolved nor formally accepted.
- Any critical finding has pending, failed, or missing retest evidence.
- Branch protection evidence is `Exception`, `Open`, stale, or incomplete.

The placeholder evidence file is deliberately `Open` and will fail this enterprise gate until a real external report, triage, and retest record have been reviewed.

To check the external review package without enterprise enforcement, run:

```bash
npm run security:external-review
```

## Full security CI

```bash
STRICT_PUBLIC_SECRET_SCAN=1 npm run security:ci
```

This is the application security gate and must pass before public production.

It validates:

- npm audit at moderate level
- public-secret checks in strict fail-closed mode
- production secret readiness
- routes
- RLS checks
- API guards
- protected routes
- client boundaries
- auth token validation
- authorization/BOLA controls
- server action identity
- security headers
- no-store protections
- origin guards
- no open proxy controls
- upload security
- upload content scanning
- audit-chain controls
- GitHub workflow security
- supply-chain controls
- trust package and trust evidence

## Supply-chain release steps

Before calling a release enterprise-ready, collect:

```bash
npm run supply-chain:lockfile
node scripts/security/check-package-lock-alignment.mjs
npm run supply-chain:floating-deps
npm run security:npm-audit:json > npm-audit.json
RELEASE_TARGET=enterprise node scripts/security/check-branch-protection-evidence.mjs
```

Then review and attach the generated lockfile, audit evidence, branch-protection evidence and SBOM artifact to the release package.

High or critical npm audit findings must be fixed or triaged in:

```text
docs/security/NPM_AUDIT_TRIAGE.md
```

## Branch protection configuration evidence

If the GitHub branch protection or rulesets API is unavailable, configure the required checks manually:

```text
Settings → Rulesets/Branches → main → required checks → add every check listed in docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md
```

Do not mark branch protection evidence `Complete` without API-generated or screenshot-backed proof.

## Release evidence checklist

Use:

```text
docs/RELEASE_EVIDENCE_CHECKLIST.md
```

as the canonical checklist for screenshots, logs, approvals, and external evidence.

## Promotion rule

Do not promote to public production unless all of these are true:

- Full Security Suite is green for the exact commit.
- `npm run security:ci` passes with `STRICT_PUBLIC_SECRET_SCAN=1`.
- `npm run release:readiness` passes.
- Branch protection evidence validates successfully.
- Vercel build/deploy is green.
- Supabase live RLS evidence is attached.
- Audit-chain transactional migration is applied in the target project.
- Billing/webhook checks are attached.
- SBOM artifact `risck-comply-sbom` is attached.
- Any high/critical npm audit item is fixed or triaged with owner and expiry.
- Any remaining exceptions are documented with owner and expiry.

Do not promote to enterprise release unless `npm run release:enterprise-readiness` passes with real external security review evidence and `RELEASE_TARGET=enterprise node scripts/security/check-branch-protection-evidence.mjs` passes with status `Complete`.
