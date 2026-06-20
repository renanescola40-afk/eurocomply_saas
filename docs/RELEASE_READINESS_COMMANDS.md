# Release Readiness Commands

This document lists the commands used to validate EuroComply before promoting a build to beta, public production, or enterprise review.

## Enterprise blocking CI

Every release candidate must have a green GitHub Actions run for:

```text
Full Security Suite / Enterprise merge/deploy gate
```

The Full Security Suite runs the enterprise merge/deploy blockers:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=moderate
npm run security:ci
npm run quality:routes
```

It also runs E2E when Playwright is configured, Actionlint, Gitleaks, Semgrep, CodeQL, Dependency Review, OSSF Scorecard, branch-protection evidence validation, and SBOM generation.

A release is blocked when the Full Security Suite is not green for the exact commit being promoted.

## Fast release governance check

```bash
npm run release:readiness
```

This command validates the Release Candidate governance package:

- `security:release-candidate`
- `security:release-evidence`

It is intentionally separate from the full CI command so release owners can check governance evidence without running the entire test suite. It does **not** replace the required green Full Security Suite run.

## Full security CI

```bash
npm run security:ci
```

This is the application security gate and must pass before public production.

It validates:

- npm audit at moderate level
- public-secret checks
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
npm run supply-chain:floating-deps
npm run security:npm-audit:json > npm-audit.json
node scripts/security/check-branch-protection-evidence.mjs
```

Then review and attach the generated lockfile, audit evidence, branch-protection evidence and SBOM artifact to the release package.

High or critical npm audit findings must be fixed or triaged in:

```text
docs/security/NPM_AUDIT_TRIAGE.md
```

## Release evidence checklist

Use:

```text
docs/RELEASE_EVIDENCE_CHECKLIST.md
```

as the canonical checklist for screenshots, logs, approvals, and external evidence.

## Promotion rule

Do not promote to public production unless all of these are true:

- Full Security Suite is green for the exact commit.
- `npm run security:ci` passes.
- `npm run release:readiness` passes.
- Branch protection evidence validates successfully.
- Vercel build/deploy is green.
- Supabase live RLS evidence is attached.
- Audit-chain transactional migration is applied in the target project.
- Billing/webhook checks are attached.
- SBOM artifact `eurocomply-sbom` is attached.
- Any high/critical npm audit item is fixed or triaged with owner and expiry.
- Any remaining exceptions are documented with owner and expiry.
