# PR Autopilot runbook

## Purpose

PR Autopilot reduces repetitive pull-request work without weakening branch protection. It can classify PR risk, keep eligible internal branches current with `main`, ask Codex to repair bounded CI failures on the same branch, and merge only after GitHub reports a clean exact-head state.

The coding agent never merges directly. The default-branch controller in `.github/workflows/pr-autopilot.yml` is the only automation allowed to merge under this policy.

## Required repository secrets

Configure these in **Settings → Secrets and variables → Actions**:

- `OPENAI_API_KEY`: used only by `openai/codex-action@v1` through its protected API proxy.
- `PR_AUTOPILOT_TOKEN`: a fine-grained token limited to this repository with Contents read/write, Pull requests read/write, Issues read/write, and Actions read.

Use a dedicated bot or service account where possible. Do not give this token access to Supabase, Stripe, Vercel, production environments, customer data, or organization-wide administration.

A separate token is required because pushes and merges performed with the workflow's normal `GITHUB_TOKEN` do not reliably start the downstream workflow and deployment events needed for exact-head validation.

## Labels

The controller creates and maintains these labels:

| Label | Meaning |
| --- | --- |
| `autofix:allowed` | The current PR file set is inside the bounded Codex repair policy. |
| `autopilot:eligible` | The PR may be synchronized and merged after all merge requirements are met. |
| `autopilot:merge` | Owner opt-in for a non-protected, standard-risk PR. |
| `autopilot:blocked` | The controller stopped because of policy, size, conflict, trust, or configuration. |
| `risk:high` | The PR touches a protected product, security, data, payment, release, or operational boundary. |

Documentation, decision-record, issue-template, and non-security test-only PRs may become merge-eligible automatically. Other non-protected changes require `autopilot:merge`. Protected paths can never be overridden by a label.

## Merge requirements

The controller merges only when all of the following are true on the exact PR head SHA:

1. The PR is internal, open, non-draft, authored from a trusted branch prefix, and created by a trusted author.
2. The PR is policy-eligible and does not exceed the configured change-size limits.
3. GitHub reports `MERGEABLE` and `CLEAN`.
4. The status-check rollup is `SUCCESS`.
5. The review decision is `APPROVED`.
6. Every loaded review thread is resolved and the thread query is not truncated.
7. The merge request includes the expected head SHA so a concurrent push makes the operation fail closed.

Branch protection remains authoritative. PR Autopilot does not dismiss reviews, mark conversations resolved, forge check results, disable checks, or use an administrator bypass.

## CI auto-fix lifecycle

`Codex PR Auto-Fix` runs only after the repository `CI` workflow fails or when manually dispatched for a specific PR.

1. Resolve the PR from the failed workflow run.
2. Load policy from the default branch, not from the PR.
3. Require an internal trusted branch, trusted author, `autofix:allowed`, safe paths, size limits, and both required secrets.
4. Limit attempts to the policy maximum, currently two per PR.
5. Checkout the exact head without persisted credentials.
6. Download failed CI logs and install npm dependencies with lifecycle scripts disabled.
7. Run Codex with `sandbox: workspace-write`, `safety-strategy: drop-sudo`, and an explicit protected-path prohibition. `danger-full-access` and the `unsafe` safety strategy are forbidden.
8. Reject any Codex edit outside the allowed path boundary or unrelated to the original PR, focused tests, or a decision record.
9. Run package-lock alignment, lint, typecheck, unit tests, and build.
10. Verify that the remote head has not moved, then push a single repair commit to the same branch with `PR_AUTOPILOT_TOKEN`.
11. Let all required GitHub checks rerun on the new exact head.

## Vercel rate-limit behavior

Vercel quota and rate-limit signals do not block repository delivery. When Vercel reports `Deployment rate limited`, `build-rate-limit`, `retry in 24 hours`, `upgradeToPro=build-rate-limit`, or an equivalent deployment-quota condition:

1. Continue implementation, branch creation, commits, push, and PR creation.
2. Continue every available GitHub-side quality and security check.
3. Do not infer a code defect from the Vercel-only provider status.
4. Do not run Codex autofix merely to change a provider quota result.
5. Add an `External deployment status` section to the PR using `.github/agents/pr-creation-with-vercel-limit.prompt.md`.
6. Record Vercel deployment as `BLOCKED` and production validation as `NOT VERIFIED` for the exact SHA.
7. Leave merge behavior to branch protection. A required failed Vercel check cannot be bypassed; a non-required Vercel status does not prevent PR creation.

This separates three different outcomes truthfully: repository implementation, PR delivery, and production deployment. A blocked Vercel deployment does not erase completed code work, but completed code work does not prove production deployment.

## Protected domains

The canonical path policy is `.github/pr-autopilot-policy.json`. It blocks autonomous repair and merge for, at minimum:

- GitHub workflows, actions, and agent prompts;
- authentication, authorization, RBAC, RLS, tenancy, middleware, and Supabase authority;
- billing, Stripe, webhooks, entitlements, and payment state;
- migrations and SQL;
- security and release scripts;
- secrets, production configuration, audit evidence, and legal material;
- package manifests and the Autopilot/agent governance files themselves.

These PRs remain manual even if all checks are green.

## Conflict behavior

The controller may ask GitHub to update an eligible branch with `main` when GitHub reports it as behind. It never attempts semantic or textual conflict resolution. A `DIRTY` or `CONFLICTING` state receives `autopilot:blocked` and requires a human or explicitly authorized coding-agent correction.

## Failure handling

- Missing token: classify and comment, but do not sync, push, or merge.
- Vercel rate limit or quota: create/update the PR, record the deployment blocker truthfully, and do not modify code to obtain a green provider status.
- Other external provider failure: do not modify code merely to obtain green status; continue PR delivery when the code work itself is reviewable and authorized.
- No safe Codex change: comment and stop without a commit.
- Boundary violation: fail before verification or push.
- Stale branch during repair: refuse the push.
- Required checks or approval missing: remain eligible and wait for a later event or hourly reconciliation.
- Merge rejected by GitHub: fail visibly and leave the PR open.

## Rollback

Disable the workflows by reverting:

- `.github/workflows/pr-autopilot.yml`
- `.github/workflows/codex-autofix.yml`
- `.github/pr-autopilot-policy.json`

Then revoke `PR_AUTOPILOT_TOKEN`. No application runtime, database, billing, tenant, or production-data rollback is required.
