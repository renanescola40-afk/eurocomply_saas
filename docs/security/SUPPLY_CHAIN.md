# RISCK COMPLY Supply Chain Security Standard

This document defines the baseline supply-chain controls for source code, dependencies and GitHub Actions.

## Current required controls

- `package.json` pins `packageManager` to `npm@10.8.2`.
- `.npmrc` keeps `package-lock=true`, `audit=true`, `fund=false` and `save-exact=true`.
- `package-lock.json` is committed and must stay aligned with `package.json`.
- CI must use `npm ci --ignore-scripts`.
- The supply-chain gate reports `npm runtime drift` when the local/CI npm version differs from the package manager pin.
- The safe lockfile refresh command is `npm run supply-chain:lockfile`, which expands to `npm install --package-lock-only --ignore-scripts`.
- Historical marker for the existing gate: `npm install --ignore-scripts` was the temporary mode before the lockfile existed and must not be reintroduced into CI.
- Historical marker for the existing gate: `cache disabled until lockfile exists`. Current target state is cache enabled only after lockfile exists and only with lockfile-backed `npm ci`.

## CI and required-check drift

Required checks must map to real workflow/job names so GitHub does not leave checks stuck as `Expected`.

The repository-side validator is:

```bash
node scripts/security/check-ci-required-checks-validation.mjs
```

Evidence is stored in:

```txt
docs/security/evidence/runtime/ci-required-checks-validation.json
```

The validator checks:

- `required_status_checks`
- `missing_required_checks`
- `required_checks_without_pull_request_trigger`
- `pull_request_target_workflows`
- `branch_protection_ui_verified`

## Dependency Review

Dependency Review must run on pull requests and fail closed on high severity findings.

Required workflow markers:

```txt
Dependency Review
vulnerability-check: true
license-check: false
fail-on-severity: high
comment-summary-in-pr: never
```

License policy remains separate from this workflow because legal/product review is required before enforcing broad license deny rules.

## npm audit

Required audit commands:

```txt
npm run security:npm-audit:prod
npm run security:npm-audit:all
npm run security:npm-audit:json
npm run security:npm-audit:summary
```

High and critical findings are blockers until fixed or triaged in `docs/security/NPM_AUDIT_TRIAGE.md` with owner, reachability, decision and expiry.

## Floating version policy

The supply-chain gate warns on floating version specs. Use:

```txt
npm run supply-chain:floating-deps
```

Required phrase for the existing gate: `floating version`.

## CodeQL and SBOM

CodeQL runs in the standalone CodeQL workflow and in the Full Security Suite. The Full Security Suite also generates the `risck-comply-sbom` CycloneDX artifact from `package-lock.json`.

## Required supply-chain scripts

```txt
supply-chain:lockfile
supply-chain:floating-deps
security:zod-compat
security:final-readiness
security:final-readiness:report
```

## Remaining risks

- Branch protection and ruleset settings still require GitHub UI/admin verification before branch evidence can be marked `Complete`.
- Some GitHub Actions still use version tags instead of immutable full-length SHAs. Pin those refs in a dedicated follow-up after each action/ref is reviewed.
- Floating dependency specs remain warning-level until dependency triage replaces them with exact audited versions.
