# CircleCI parameterless one-shot recovery — 2026-11-02

Incident: CircleCI pipeline #738 rejected a manual API-triggered run with `Configuration error: Unexpected argument(s): parameters`. The captured page does not expose its raw trigger payload.
The native CircleCI file has pipeline parameters declared at top level; this experiment bypasses only the manual API parameter input, not GitHub's spending limits.

Temporary branch: `ci/circleci-gh-actions-one-shot-20261102`
Based on PR #2592 source SHA: `4d2c6caa36d961158ff50b9f19e3a73ea09c065d`

An ordinary branch push triggers one source-only Docker Small smoke job through an unparameterized and branch-filtered workflow.
The job enforces the exact CircleCI checkout SHA, its own branch and absence of privileged credentials. It uses Node 22 to test GitHub workflow contracts without npm install, external providers, production writes, deployment or releases.

Do not rerun or push additional commits on this experiment branch until result and Free credit consumption are reviewed. Do not merge this branch or claim that a CircleCI-only success means GitHub CodeQL, GitHub Actions or Enterprise gates passed.

Only the experimental branch carries this bypass; main and PR #2592 stay unchanged.
