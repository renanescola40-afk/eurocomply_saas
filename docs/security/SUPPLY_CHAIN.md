# EuroComply Supply Chain Security Standard

This document defines the baseline supply-chain security controls for EuroComply source code, dependencies and GitHub Actions workflows.

## Purpose

EuroComply depends on the Node.js/npm ecosystem, GitHub Actions and third-party packages. The goal of this standard is to reduce dependency confusion, malicious lifecycle script execution, vulnerable dependency drift and license risk.

## Current Controls

| Control | Location |
| --- | --- |
| Package manager pinning | `package.json` `packageManager` |
| npm runtime drift warning | `scripts/security/check-supply-chain.mjs` |
| npm repository policy | `.npmrc` |
| Safe lockfile generation command | `package.json` `supply-chain:lockfile` |
| Floating dependency triage command | `package.json` `supply-chain:floating-deps` |
| Zod error API compatibility guard | `package.json` `security:zod-compat` |
| Final security readiness command | `package.json` `security:final-readiness` |
| Final security readiness JSON report | `package.json` `security:final-readiness:report` |
| npm audit triage commands | `package.json` audit scripts |
| Non-blocking npm audit summary | `.github/workflows/security-ci.yml` |
| Floating dependency spec warnings | `scripts/security/check-supply-chain.mjs` |
| Dependency Review | `.github/workflows/dependency-review.yml` |
| CodeQL SAST | `.github/workflows/codeql.yml` |
| Internal security CI | `.github/workflows/security-ci.yml` |
| Supply-chain regression gate | `scripts/security/check-supply-chain.mjs` |
| Workflow regression gate | `scripts/security/check-github-security-workflows.mjs` |

## npm Policy

The repository `.npmrc` enforces:

```txt
package-lock=true
audit=true
fund=false
save-exact=true
```

This means:

- npm should generate a lockfile when dependencies are installed.
- npm audit remains enabled.
- funding prompts are disabled for deterministic CI logs.
- newly saved package versions are exact instead of broad ranges.

## Package Manager Runtime Policy

The repository pins the expected package manager in `package.json`:

```txt
npm@10.8.2
```

`npm run security:supply-chain` warns on npm runtime drift when `npm --version` does not match the pinned `packageManager` value.

This warning is intentionally non-blocking until `package-lock.json` is committed. Before generating the lockfile or using `npm-audit.json` for dependency updates, align local/CI npm with the pinned package manager so the lockfile and audit output are reproducible.

## Lifecycle Script Policy

The repository must not define these lifecycle scripts in `package.json`:

```txt
preinstall
install
postinstall
prepare
```

The security CI and Vercel deploy install dependencies with:

```txt
npm install --ignore-scripts
```

This reduces risk from dependency lifecycle scripts while the project does not yet have a committed `package-lock.json`.

## GitHub Actions npm Cache Policy

The Security CI currently keeps npm cache disabled until lockfile exists.

```txt
cache disabled until lockfile exists
```

Reason:

```txt
package-lock.json is the dependency graph source of truth for reproducible npm cache keys.
```

While `package-lock.json` is missing, `.github/workflows/security-ci.yml` must not use:

```txt
cache: npm
```

Once `package-lock.json` is committed and CI switches to:

```txt
npm ci --ignore-scripts
```

then npm cache can be re-enabled using the lockfile-backed cache key from `actions/setup-node`.

The supply-chain gate enforces this by failing if `cache: npm` appears in Security CI before `package-lock.json` exists.

## npm Audit Triage

The project exposes explicit npm audit commands:

```txt
npm run security:npm-audit:prod
npm run security:npm-audit:all
npm run security:npm-audit:json
npm run security:npm-audit:summary
```

Use `security:npm-audit:prod` first to determine whether any high-severity advisory affects production dependencies.
Use `security:npm-audit:json` when Vercel or npm only prints a summarized vulnerability count and package-level detail is needed.
Use `security:npm-audit:summary` after generating `npm-audit.json` to print the package, severity, vulnerable range, affected paths and advertised fix.

Security CI currently captures and prints the npm audit summary as a non-blocking diagnostic step:

```txt
npm run security:npm-audit:json > npm-audit.json || true
npm run security:npm-audit:summary || true
```

This diagnostic step is intentionally warning-only. Promote `security:npm-audit:prod` into `security:ci` only after the production audit is clean or an accepted exception is documented.

## Floating Version Spec Policy

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

This command does not contact npm. It reads `package.json` and lists the exact dependency paths that must be replaced during lockfile/audit triage.

These warnings are not hard failures yet because the repository still lacks a committed `package-lock.json` and the current npm audit findings need package-level triage first.

Target state:

```txt
No dependency uses latest or open-ended ranges
package-lock.json committed
npm ci --ignore-scripts used in CI
floating dependency specs treated as failures
```

When replacing a floating spec, prefer the exact version resolved in the audited lockfile instead of blindly choosing the newest version.

## Zod Compatibility Policy

The project uses Zod v4, where validation issues should be read from `ZodError.issues`.

The compatibility guard is exposed through:

```txt
npm run security:zod-compat
```

This command scans source and script files for deprecated `.error.errors` access. It is included in `security:ci` before `typecheck` so a regression is reported with a targeted message instead of surfacing later as a Next.js build type error.

## Lockfile Status

`package-lock.json` is currently treated as a warning rather than a hard failure.

Generate the first lockfile with the repository-managed command:

```txt
npm run supply-chain:lockfile
```

This command expands to:

```txt
npm install --package-lock-only --ignore-scripts
```

Use this command only after aligning local npm with `packageManager`. Review the generated `package-lock.json`, then run the audit triage commands before replacing floating dependency specs.

Target state:

```txt
package-lock.json committed
npm ci --ignore-scripts used in CI
missing lockfile treated as a failure
```

This will improve build reproducibility and supply-chain traceability.

## Final Security Readiness

Use the manual readiness command before treating dependency and supply-chain hardening as complete:

```txt
npm run security:final-readiness
```

Security CI also emits a machine-readable readiness report through:

```txt
npm run security:final-readiness:report
```

The JSON report is written to `final-security-readiness.json` and is uploaded inside the `npm-audit-triage` GitHub Actions artifact. This report is intentionally non-blocking until the lockfile, audit findings and floating dependency specs are resolved.

The readiness command is intentionally not part of `security:ci` yet because it is expected to fail until the lockfile is committed, `npm-audit.json` has been generated and the remaining floating dependency specs have been replaced with exact audited versions.

The command reports release/security readiness blockers for:

- missing `package-lock.json`
- missing `npm-audit.json`
- remaining floating dependency specs
- npm audit findings still present in `npm-audit.json`
- package manager pin drift

Promote this readiness check into CI only after the project reaches the target supply-chain state.

## Dependency Review Policy

Pull requests are checked by GitHub Dependency Review.

The workflow fails on:

```txt
high severity vulnerabilities
```

The workflow also denies selected strong-copyleft licenses:

```txt
GPL-2.0
GPL-3.0
AGPL-1.0
AGPL-3.0
LGPL-2.0
LGPL-2.1
LGPL-3.0
```

## CodeQL Policy

CodeQL runs on:

- push to `main`
- pull requests targeting `main`
- weekly schedule

Queries enabled:

```txt
security-extended
security-and-quality
```
