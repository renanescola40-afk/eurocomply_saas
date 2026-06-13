# Release Readiness Commands

This document lists the commands used to validate EuroComply before promoting a build to beta, public production, or enterprise review.

## Fast release governance check

```bash
npm run release:readiness
```

This command validates the Release Candidate governance package:

- `security:release-candidate`
- `security:release-evidence`

It is intentionally separate from the full CI command so release owners can check governance evidence without running the entire test suite.

## Full security CI

```bash
npm run security:ci
```

This is the stronger gate and should pass before public production.

It validates:

- preflight
- routes
- RLS checks
- API guards
- protected routes
- client boundaries
- security headers
- no-store protections
- origin guards
- upload security
- upload content scanning
- audit-chain controls
- GitHub workflow security
- supply-chain controls
- Zod compatibility
- trust package and trust evidence
- typecheck
- test suite

## Supply-chain release steps

Before calling a release enterprise-ready, run:

```bash
npm run supply-chain:lockfile
npm run supply-chain:floating-deps
npm run security:npm-audit:json > npm-audit.json
npm run security:npm-audit:summary
```

Then review and attach the generated lockfile and audit evidence to the release package.

## Release evidence checklist

Use:

```text
docs/RELEASE_EVIDENCE_CHECKLIST.md
```

as the canonical checklist for screenshots, logs, approvals, and external evidence.

## Promotion rule

Do not promote to public production unless all of these are true:

- `npm run security:ci` passes.
- `npm run release:readiness` passes.
- Vercel build/deploy is green.
- Supabase live RLS evidence is attached.
- Audit-chain transactional migration is applied in the target project.
- Billing/webhook checks are attached.
- Any remaining exceptions are documented with owner and expiry.
