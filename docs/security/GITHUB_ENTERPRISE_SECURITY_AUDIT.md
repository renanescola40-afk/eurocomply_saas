# GitHub Enterprise Security Audit

Date: 2026-06-25
Repository: `renanescola40-afk/eurocomply_saas`
Scope: `.github/workflows/*`, supply-chain gates, branch-protection evidence, release documentation.

## Executive status

Current status: **No-Go for enterprise release**.

The repository has a strong existing security posture, but enterprise release must remain blocked until these gaps are closed with evidence:

1. `package-lock.json` is aligned with `package.json`.
2. Branch protection evidence is `Complete`; `Exception` or `Open` blocks enterprise release.
3. Full Security Suite is green for the exact commit being promoted.
4. Secret scanning runs fail-closed with strict public scanning enabled.
5. Any high or critical npm audit finding is fixed or triaged with owner, risk decision, and expiry.

## Workflow audit findings

### Full Security Suite

Expected enterprise controls:

- `npm ci --ignore-scripts`
- package-lock alignment gate
- lint
- typecheck
- unit tests
- build
- `npm audit --audit-level=moderate`
- route quality
- `npm run security:ci`
- Actionlint
- Gitleaks
- Semgrep
- CodeQL
- Dependency Review
- OSSF Scorecard
- CycloneDX SBOM artifact named `risck-comply-sbom`
- final enterprise merge/deploy gate

Observed issue: the repository already has `.github/workflows/full-security-suite.yml`, but the committed evidence expected `risck-comply-sbom` while the workflow generated a different SBOM path/artifact name. The branch-protection evidence has been updated so enterprise release requires the canonical artifact name and path.

### Secret scanning

Secret scanning must not be report-only for production or enterprise release. Any hardcoded real credential-like value must fail CI. Strict public scanning is mandatory.

### Dependency Review

Dependency Review must be blocking when dependency manifests or lockfiles change. High/critical npm audit findings must be fixed or triaged in `docs/security/NPM_AUDIT_TRIAGE.md`.

### Branch protection

Branch protection evidence is currently `Exception`; enterprise release validation must fail while it is `Exception` or `Open`. The required manual setup is documented in `docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md`:

```text
Settings -> Rulesets/Branches -> main -> required checks -> add every required check listed in docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md
```

## Supply-chain finding

`package-lock.json` must match `package.json`. The gate added in this PR fails when:

- the root package name differs;
- the root version differs;
- root dependencies or devDependencies differ;
- lockfileVersion is not npm lockfile version 3.

Run:

```bash
npm install --package-lock-only --ignore-scripts
node scripts/security/check-package-lock-alignment.mjs
```

## Direct push to main

A direct push to `main` is a release-governance risk. It can bypass PR review evidence and trigger production workflows before enterprise approval is complete. Treat any direct push to `main` as an exception until:

1. Full Security Suite is green for the exact pushed commit.
2. Branch protection evidence is `Complete`.
3. Release owner records the exception.
4. Any triggered production deploy has smoke-test and rollback evidence.

## Connector limitation

The available GitHub connector allowed repository content changes and PR creation, but it did not expose a ruleset/branch-protection mutation that could safely configure required checks in GitHub Settings. Therefore this audit does not invent UI state. It records exact manual instructions and keeps branch-protection evidence as `Exception` until verified.
