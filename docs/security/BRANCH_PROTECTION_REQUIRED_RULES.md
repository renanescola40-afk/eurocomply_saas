# Branch Protection Required Rules

This document is the canonical branch protection policy for RISCK COMPLY `main` and every production or enterprise release branch.

A pull request, deployment, or release **must not** be described as enterprise-ready unless the Full Security Suite is green, the repository-side required-check validation is green, and the branch protection evidence in `docs/security/evidence/runtime/branch-protection-required-checks.json` validates successfully.

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

Direct push to `main` is an enterprise release risk. If it occurs, treat it as a governance exception: do not promote that commit until the exact SHA has a green `Full Security Suite / Enterprise merge/deploy gate`, Code Owner review evidence, repository-side required-check validation, and branch protection evidence marked `Complete`.

## Required status checks

Configure these exact checks as required in GitHub branch protection or a repository ruleset. The workflow/job names must match exactly; otherwise GitHub can leave a required check stuck as `Expected` forever.

| Workflow | Required check |
| --- | --- |
| Full Security Suite | Core CI, build and npm audit |
| Full Security Suite | Actionlint |
| Full Security Suite | Secret scanning (Gitleaks) |
| Full Security Suite | Semgrep SAST |
| Full Security Suite | CodeQL |
| Full Security Suite | Dependency Review |
| Full Security Suite | OSSF Scorecard |
| Full Security Suite | Enterprise merge/deploy gate |
| CI | quality |
| RISCK COMPLY Security CI | Run security gates, typecheck and tests |
| Gitleaks | Scan repository for accidental secret exposure |
| Secret Scanning | Production secret readiness gate |

The final blocking signal is `Full Security Suite / Enterprise merge/deploy gate`. It depends on every Full Security Suite security and quality job. Keep the individual checks required as defense in depth so a renamed or removed final gate is visible during review.

## Repository-side validation

The repository includes a drift detector for required checks:

```bash
node scripts/security/check-ci-required-checks-validation.mjs
```

This gate validates that every required check listed in `docs/security/evidence/runtime/branch-protection-required-checks.json` maps to a real workflow/job pair and that required checks run on `pull_request`. It also fails if any workflow uses `pull_request_target`, because PR workflows must not run untrusted code with privileged token or repository secrets.

When required check names intentionally change, update the validation evidence with:

```bash
node scripts/security/check-ci-required-checks-validation.mjs --write
```

Then review and commit `docs/security/evidence/runtime/ci-required-checks-validation.json` in the same PR.

## Exact GitHub UI instructions

The available connector did not expose a branch protection or ruleset mutation action, so do not claim a PR applied GitHub UI configuration. Apply the required checks manually as follows:

Settings -> Rulesets/Branches -> `main` -> required checks -> add every exact check listed in the table above.

Then enable or verify:

- Require a pull request before merging.
- Required approvals: at least `1`.
- Require review from Code Owners.
- Dismiss stale pull request approvals when new commits are pushed.
- Require conversation resolution before merging.
- Require status checks to pass.
- Require branches to be up to date before merging.
- Block force pushes.
- Block deletions.
- Restrict who can push: release administrators only; no regular direct push path to `main`.

## Enterprise blockers

A pull request is **not enterprise-ready** when any of these conditions is true:

- `npm ci --ignore-scripts` fails.
- `npm run lint` fails.
- `npm run typecheck` fails.
- `npm run test` fails.
- `npm run test:e2e` fails when Playwright/E2E is configured with a runtime.
- `npm run build` fails.
- `npm audit --audit-level=moderate` fails because of untriaged high or critical findings.
- `npm run security:ci` fails.
- `npm run quality:routes` fails.
- `npm run security:package-lock` fails.
- `node scripts/security/check-ci-required-checks-validation.mjs` fails.
- Actionlint fails.
- Gitleaks or GitHub secret scanning fails.
- Strict public scanning is missing or public exposure scanning finds a real value.
- Semgrep fails.
- CodeQL fails.
- Dependency Review fails.
- OSSF Scorecard fails.
- Branch protection evidence is missing, stale, `Open`, or `Exception` for an enterprise release.
- Any workflow prints, echoes, uploads, or summarizes secrets or credential-like values.

High or critical npm audit findings are release blockers until they are fixed or triaged in `docs/security/NPM_AUDIT_TRIAGE.md` with an owner, risk decision, remediation target, and expiry.

## Workflow logging policy

Workflows must not echo credentials, print environment dumps, upload `.env*` files, or tee commands that may reveal credential-like values. CI builds in `Full Security Suite` use placeholder public values rather than provider stores. Deployment workflows may reference protected provider values only through provider inputs or environment variables needed by deployment commands, and must keep `persist-credentials: false` on checkout.

## Evidence requirements

Before release promotion, attach or update:

- `docs/security/evidence/runtime/branch-protection-required-checks.json`
- `docs/security/evidence/runtime/ci-required-checks-validation.json`
- Full Security Suite run URL and commit SHA
- SBOM artifact named `risck-comply-sbom`, generated from `docs/security/evidence/runtime/sbom.cyclonedx.json`
- npm audit artifact or triage record
- Release approval / Go-No-Go record

Run the evidence validators locally or in CI:

```bash
node scripts/security/check-ci-required-checks-validation.mjs
node scripts/security/check-branch-protection-evidence.mjs
```

For enterprise release validation, run the same validator with enterprise release mode enabled.

## Release rule

Production deploy and release approval stay blocked until:

1. all required GitHub checks are green;
2. Code Owner review has approved the PR;
3. no high/critical npm audit item is untriaged;
4. the Full Security Suite generated the CycloneDX SBOM artifact;
5. branch protection evidence is `Complete`; and
6. the release owner records the Full Security Suite green run in the release evidence package.
