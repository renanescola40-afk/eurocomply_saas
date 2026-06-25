# Branch Protection Required Rules

This document is the canonical branch protection policy for RISCK COMPLY `main` and every production or enterprise release branch.

A pull request, deployment, or release **must not** be described as enterprise-ready unless the Full Security Suite is green and the branch protection evidence in `docs/security/evidence/runtime/branch-protection-required-checks.json` validates successfully.

## Current status

As of 2026-06-25, branch protection evidence is **Exception** rather than `Complete`. Enterprise release validation must fail while this evidence is `Exception` or `Open`.

The repository code now contains the required policy, checks, and validation script, but the GitHub UI/ruleset state still needs administrator verification before the evidence can be marked `Complete`.

## Required branch protection settings

Enable these rules for `main` and production release branches:

- Require a pull request before merging.
- Require at least one approving review.
- Dismiss stale approvals when new commits are pushed.
- Require review from Code Owners.
- Require conversation resolution before merge.
- Require status checks to pass before merge.
- Require branches to be up to date before merge.
- Block force pushes.
- Block branch deletion.
- Restrict direct pushes to release administrators only.

## Required status checks

Configure these checks as required in GitHub branch protection or a repository ruleset:

| Workflow | Required check |
| --- | --- |
| Full Security Suite | Core CI, build and npm audit |
| Full Security Suite | Actionlint |
| Full Security Suite | Secret scanning (Gitleaks) |
| Full Security Suite | Semgrep SAST |
| Full Security Suite | CodeQL (javascript-typescript) |
| Full Security Suite | Dependency Review |
| Full Security Suite | OSSF Scorecard |
| Full Security Suite | Enterprise merge/deploy gate |
| CI | quality |
| RISCK COMPLY Security CI | Run security gates, typecheck and tests |
| Gitleaks | Scan repository for accidental secret exposure |
| Secret Scanning | Production secret readiness gate |

The final blocking signal is `Full Security Suite / Enterprise merge/deploy gate`. It depends on every Full Security Suite security and quality job. Keep the individual checks required as defense in depth so a renamed or removed final gate is visible during review.

## Exact GitHub UI instructions when API mutation is unavailable

Settings → Rulesets/Branches → `main` → required checks → add the complete list below:

```text
Full Security Suite / Core CI, build and npm audit
Full Security Suite / Actionlint
Full Security Suite / Secret scanning (Gitleaks)
Full Security Suite / Semgrep SAST
Full Security Suite / CodeQL (javascript-typescript)
Full Security Suite / Dependency Review
Full Security Suite / OSSF Scorecard
Full Security Suite / Enterprise merge/deploy gate
CI / quality
RISCK COMPLY Security CI / Run security gates, typecheck and tests
Gitleaks / Scan repository for accidental secret exposure
Secret Scanning / Production secret readiness gate
```

Also enable:

```text
Require a pull request before merging
Require approvals: 1 or more
Dismiss stale pull request approvals when new commits are pushed
Require review from Code Owners
Require conversation resolution before merging
Require branches to be up to date before merging
Block force pushes
Block deletions
Restrict direct pushes
```

## Direct push to main risk

A direct push to `main` is an enterprise release risk because it can bypass PR review evidence and trigger downstream workflows before release approval is complete. Treat any direct push to `main` as a release governance exception until these are true:

1. Full Security Suite is green for the exact pushed commit.
2. Branch protection evidence is `Complete`.
3. Release owner records the exception and confirms no unreviewed code reached production.
4. Any production deploy triggered from the push has a rollback and smoke-test record.

Do not mark a direct-pushed commit enterprise-ready solely because CI passed.

## Enterprise blockers

A pull request is **not enterprise-ready** when any of these conditions is true:

- `npm run lint` fails.
- `npm run typecheck` fails.
- `npm run test` fails.
- `npm run test:e2e` fails when Playwright/E2E is configured.
- `npm run build` fails.
- `npm audit --audit-level=moderate` fails because of untriaged high or critical findings.
- `npm run security:ci` fails.
- `npm run quality:routes` fails.
- Actionlint fails.
- Gitleaks or GitHub secret scanning fails.
- `STRICT_PUBLIC_SECRET_SCAN=1` is absent or strict public secret scanning finds a real value.
- Semgrep fails.
- CodeQL fails.
- Dependency Review fails.
- OSSF Scorecard fails.
- Branch protection evidence is missing, stale, `Open`, or `Exception` for an enterprise release.
- `package-lock.json` is not aligned with `package.json`.

High or critical npm audit findings are release blockers until they are fixed or triaged in `docs/security/NPM_AUDIT_TRIAGE.md` with an owner, risk decision, remediation target, and expiry.

## Evidence requirements

Before release promotion, attach or update:

- `docs/security/evidence/runtime/branch-protection-required-checks.json`
- Full Security Suite run URL and commit SHA
- SBOM artifact named `risck-comply-sbom`
- npm audit artifact or triage record
- Release approval / Go-No-Go record

Run the evidence validator locally or in CI:

```bash
node scripts/security/check-branch-protection-evidence.mjs
```

For enterprise release enforcement, run:

```bash
RELEASE_TARGET=enterprise node scripts/security/check-branch-protection-evidence.mjs
```

## Release rule

Production deploy and release approval stay blocked until:

1. all required GitHub checks are green;
2. Code Owner review has approved the PR;
3. no high/critical npm audit item is untriaged;
4. the Full Security Suite generated an SBOM artifact;
5. branch protection evidence status is `Complete`; and
6. the release owner records the Full Security Suite green run in the release evidence package.
