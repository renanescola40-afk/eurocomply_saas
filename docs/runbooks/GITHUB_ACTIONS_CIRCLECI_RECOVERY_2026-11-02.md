# RISCK COMPLY — CircleCI Free GitHub Actions recovery

Date: 2026-11-02. Source-only tests for PR #2592 only.

Existing native .circleci/config.yml is reused instead of Preview translation:
Preview does not enforce GitHub concurrency and some permission scopes.

## Zero-spend safeguard

- Parameter run_actions_recovery defaults to false. No automatic job.
- The new Docker Small job runs only on fix/actions-p0-runner-storm-20261102.
- It checks the exact CircleCI checkout SHA, Node 22 and absence of privileged credentials.
- It runs built-in Node source-contract tests only; no npm install, deploy, external API or paid GitHub runners.
- No CircleCI execution is authorized until the owner verifies remaining Free credits and no auto-refill.
- Do not equate a CircleCI source-contract success with GitHub required-check PASS or Enterprise gate acceptance.

## Activation (operator account step, if a suitable CircleCI GitHub project exists)

1. Open https://app.circleci.com/, verify Free plan and remaining credits.
2. Confirm repository connection is the private GitHub renanescola40-afk/eurocomply_saas, not an outdated GitLab mirror.
3. Confirm CircleCI reads the current branch .circleci/config.yml.
4. Trigger Pipeline once, branch fix/actions-p0-runner-storm-20261102, boolean run_actions_recovery=true.
5. Save pipeline URL, exact SHA, running steps and result; never blindly rerun a failed job.

CircleCI-only results do NOT unblock exhausted GitHub-hosted Actions and do not enforce main merge protection.
Rollback: revert this isolated change. No production, payments or merge changes involved.
