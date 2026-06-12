# EuroComply Supply Chain Security Standard

This document defines the baseline supply-chain security controls for EuroComply source code, dependencies and GitHub Actions workflows.

## Purpose

EuroComply depends on the Node.js/npm ecosystem, GitHub Actions and third-party packages. The goal of this standard is to reduce dependency confusion, malicious lifecycle script execution, vulnerable dependency drift and license risk.

## Current Controls

| Control | Location |
| --- | --- |
| Package manager pinning | `package.json` `packageManager` |
| npm repository policy | `.npmrc` |
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

## Lifecycle Script Policy

The repository must not define these lifecycle scripts in `package.json`:

```txt
preinstall
install
postinstall
prepare
```

The security CI currently installs dependencies with:

```txt
npm install --ignore-scripts
```

This reduces risk from dependency lifecycle scripts while the project does not yet have a committed `package-lock.json`.

## Lockfile Status

`package-lock.json` is currently treated as a warning rather than a hard failure.

Target state:

```txt
package-lock.json committed
npm ci --ignore-scripts used in CI
missing lockfile treated as a failure
```

This will improve build reproducibility and supply-chain traceability.

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

## Regression Gates

`npm run security:supply-chain` validates:

- `packageManager` is pinned to `npm@10.8.2`
- `.npmrc` exists and has the required policy
- dangerous lifecycle scripts are not defined
- the security CI uses a safe install mode
- dependency review remains configured

`npm run security:github-workflows` validates:

- CodeQL workflow exists
- Dependency Review workflow exists
- EuroComply Security CI workflow exists
- expected actions and workflow tokens remain present

Both gates are part of:

```txt
npm run security:ci
```

## Operational Checklist

Before approving dependency changes:

1. Confirm Dependency Review passed.
2. Confirm CodeQL has no new relevant alerts.
3. Confirm `npm run security:ci` passed.
4. Review new package purpose and maintainer health.
5. Confirm no lifecycle scripts were added.
6. Confirm license compatibility.
7. If lockfile changes are present, confirm they only contain expected dependency updates.

## Open Hardening Items

- Commit a real `package-lock.json`.
- Change Security CI install from `npm install --ignore-scripts` to `npm ci --ignore-scripts`.
- Make missing `package-lock.json` a hard failure.
- Add OSV Scanner or equivalent vulnerability scanner.
- Add provenance/SBOM generation for release builds.
- Pin GitHub Actions by SHA for high-assurance environments.
