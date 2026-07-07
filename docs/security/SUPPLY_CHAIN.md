# RISCK COMPLY Supply Chain Security Standard

This document defines the baseline supply-chain security controls for RISCK COMPLY source code, dependencies and GitHub Actions workflows.

## Purpose

RISCK COMPLY depends on the Node.js/npm ecosystem, GitHub Actions and third-party packages. The goal of this standard is to reduce dependency confusion, malicious lifecycle script execution, vulnerable dependency drift, check-name drift, secret exposure and unsafe PR automation.

## Current controls

| Control | Location |
| --- | --- |
| Package manager pinning | `package.json` `packageManager` |
| npm repository policy | `.npmrc` |
| Committed npm lockfile | `package-lock.json` |
| Lockfile alignment gate | `npm run security:package-lock` |
| Safe lockfile generation command | `package.json` `supply-chain:lockfile` |
| Floating dependency triage command | `package.json` `supply-chain:floating-deps` |
| npm runtime drift warning | `scripts/security/check-supply-chain.mjs` |
| npm audit gates | `security:npm-audit:prod`, `security:npm-audit:all`, `security:npm-audit:json` |
| Zod error API compatibility guard | `package.json` `security:zod-compat` |
| Final security readiness command | `package.json` `security:final-readiness` |
| Final security readiness JSON report | `package.json` `security:final-readiness:report` |
| Dependency Review | `.github/workflows/dependency-review.yml` |
| CodeQL SAST | `.github/workflows/codeql.yml` and `.github/workflows/full-security-suite.yml` |
| Secret scanning / Gitleaks | `.github/workflows/gitleaks.yml` and `.github/workflows/full-security-suite.yml` |
| Required-check drift gate | `scripts/security/check-ci-required-checks-validation.mjs` |
| Required-check evidence | `docs/security/evidence/runtime/ci-required-checks-validation.json` |
| Supply-chain regression gate | `scripts/security/check-supply-chain.mjs` |
| Workflow regression gate | `scripts/security/check-github-security-workflows.mjs` |

## npm policy

The repository `.npmrc` enforces:

```txt
package-lock=true
audit=true
fund=false
save-exact=true
```

This means npm generates/keeps a lockfile, npm audit remains enabled, funding prompts are disabled for deterministic CI logs, and newly saved package versions are exact instead of broad ranges.

## Package manager runtime policy

The repository pins the expected package manager in `package.json`:

```txt
npm@10.8.2
```

`npm run security:supply-chain` reports npm runtime drift when `npm --version` does not match the pinned `packageManager` value. This warning should be resolved before regenerating `package-lock.json` or using npm audit output for dependency triage.

## Lifecycle script policy

The repository must not define these lifecycle scripts in `package.json`:

```txt
preinstall
install
postinstall
prepare
```

CI installs dependencies with:

```txt
npm ci --ignore-scripts
```

This keeps dependency installation deterministic and prevents dependency lifecycle scripts from executing in PR/build contexts.

The only approved lockfile refresh command is:

```txt
npm run supply-chain:lockfile
```

It expands to:

```txt
npm install --package-lock-only --ignore-scripts
```

This updates only `package-lock.json` and avoids lifecycle scripts during lockfile triage.

## GitHub Actions npm cache policy

`package-lock.json` is committed and is the dependency graph source of truth for reproducible npm cache keys.

```txt
cache enabled after lockfile exists
```

GitHub Actions may use `cache: npm` through `actions/setup-node` when the workflow also uses `npm ci --ignore-scripts`. Workflows must not fall back to `npm install` for CI validation.

## Required-check drift policy

GitHub branch protection required checks must match real workflow/job names. A stale name creates a permanent `Expected` check and can block safe merges or tempt unsafe bypasses.

The repository-side validator is:

```bash
node scripts/security/check-ci-required-checks-validation.mjs
```

Evidence is committed in:

```txt
docs/security/evidence/runtime/ci-required-checks-validation.json
```

This `ci-required-checks-validation` evidence records required checks, missing required checks, checks that do not run on `pull_request`, and whether any workflow uses `pull_request_target`.

## pull_request_target policy

PR workflows must not run untrusted code with repository secrets or privileged write tokens.

Rules:

- Use `pull_request` for normal PR validation.
- Do not use `pull_request_target` unless a future workflow is explicitly designed to avoid checkout/execution of PR code and is reviewed as a security exception.
- Do not load third-party AI review actions with secrets on PR code.
- Keep `persist-credentials: false` on `actions/checkout` unless a workflow has an explicit reviewed push-back exception.

## npm audit triage

The project exposes explicit npm audit commands:

```txt
npm run security:npm-audit:prod
npm run security:npm-audit:all
npm run security:npm-audit:json
```

`security:npm-audit:prod` checks production dependencies at high severity. `security:npm-audit:all` is part of the security gate and uses a moderate threshold. `security:npm-audit:json` captures machine-readable audit evidence when package-level triage is needed.

High and critical findings are release blockers until fixed or triaged in `docs/security/NPM_AUDIT_TRIAGE.md` with owner, reachability decision, remediation plan and expiry.

## Floating version spec policy

`npm run security:supply-chain` warns when existing dependencies use highly floating version specs such as:

```txt
latest
*
>=...
1.x
x
ranges with ||
```

Use the dedicated triage command to print only the floating dependency list:

```txt
npm run supply-chain:floating-deps
```

When replacing a floating version, prefer the exact version resolved in the audited lockfile instead of blindly choosing the newest version.

Target state:

```txt
No dependency uses latest or open-ended ranges
package-lock.json committed
npm ci --ignore-scripts used in CI
floating version specs treated as failures after triage
```

## Dependency Review policy

Pull requests are checked by GitHub Dependency Review.

The workflow must fail closed and must not use `continue-on-error: true`.

The workflow fails on:

```txt
high severity vulnerabilities
```

License enforcement is intentionally set to:

```txt
license-check: false
```

A broad deny-license policy is not enforced in this workflow because license decisions require separate legal/product triage.

## CodeQL policy

CodeQL runs on:

- push to `main`
- pull requests targeting `main`
- weekly schedule

Queries enabled in the standalone CodeQL workflow:

```txt
security-extended
security-and-quality
```

The Full Security Suite also includes a CodeQL job so branch protection can depend on `Full Security Suite / CodeQL`.

## SBOM policy

The Full Security Suite generates a CycloneDX SBOM from the committed `package-lock.json` and uploads it as the `risck-comply-sbom` artifact.

Expected runtime path:

```txt
docs/security/evidence/runtime/sbom.cyclonedx.json
```

## Remaining risks and required follow-up

- GitHub branch protection/ruleset configuration still requires admin verification in the GitHub UI before `docs/security/evidence/runtime/branch-protection-required-checks.json` can be marked `Complete`.
- Several GitHub Actions still use version tags instead of immutable full-length SHAs. Treat this as supply-chain risk until each action ref is pinned to a reviewed commit SHA.
- Floating dependency specs remain warnings until dependency triage replaces them with exact audited versions.
- `@clerk/nextjs` remains listed in `package.json` while runtime import checks prevent Clerk usage. Remove it in a separate lockfile PR only after confirming no Clerk migration code still requires the package.

## Final security readiness

Use the manual readiness command before treating dependency and supply-chain hardening as complete:

```txt
npm run security:final-readiness
```

Security CI also emits a machine-readable readiness report through:

```txt
npm run security:final-readiness:report
```

The JSON report is written to `final-security-readiness.json` and is uploaded inside the `npm-audit-triage` GitHub Actions artifact.
