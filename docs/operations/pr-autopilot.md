# PR Autopilot runbook

## Purpose

PR Autopilot reduces repetitive pull-request work without weakening branch protection. It has two bounded capabilities:

1. classify PR risk from trusted default-branch policy without checking out PR code;
2. ask Codex to repair eligible low-risk CI failures on the same branch.

It does not synchronize branches, approve reviews, resolve conversations, enable auto-merge, or merge pull requests. Final merge is always an explicit human-owner action.

## Required repository secrets

Configure these in **Settings → Secrets and variables → Actions**:

- `OPENAI_API_KEY`: used only by `openai/codex-action@v1` through its protected API proxy;
- `PR_AUTOPILOT_TOKEN`: repository-scoped token used only for a verified same-branch autofix push after remote-head comparison.

The repair token has no classifier, approval, branch-sync, merge, administrator, Vercel, Supabase, Stripe, production, or customer-data authority.

## Classifier labels

The read-only classifier creates and maintains:

| Label | Meaning |
| --- | --- |
| `autofix:allowed` | The complete current PR file set is inside the bounded same-branch repair policy. |
| `autopilot:blocked` | Automation stopped at a trust, risk, size, or protected-path boundary. |
| `risk:high` | The PR touches a protected product, security, data, payment, release, or operational domain. |
| `needs-owner` | A human owner decision or review is required. |

Labels never grant merge authority and cannot override a protected path.

## Classifier security model

`.github/workflows/pr-autopilot.yml` runs from `pull_request_target`, so it must remain read-only with respect to repository contents and PR state transitions:

- policy is loaded from the default branch;
- PR code is never checked out or executed;
- repository contents permission is read-only;
- pull-request permission is read-only;
- only issue-label writes are permitted;
- no dedicated push/merge token is available;
- no branch update or merge API exists in the workflow.

The source-contract tests fail if `pulls.merge`, `pulls.updateBranch`, `contents: write`, `PR_AUTOPILOT_TOKEN`, or PR checkout is reintroduced into the classifier.

## Human merge requirements

A human owner may merge only when all of the following are true on the exact current PR head SHA:

1. the PR is open and non-draft;
2. all required checks have succeeded;
3. an eligible reviewer other than the latest pusher approved the current reviewable head;
4. every review conversation is resolved;
5. GitHub reports a clean merge state;
6. no protected-path, incident, risk-acceptance, or owner-only blocker remains;
7. the merge operation is SHA-bound so a concurrent push fails closed.

Earlier green checks and stale approvals are not reusable evidence after a new push.

## CI auto-fix lifecycle

`Codex PR Auto-Fix` runs only after the repository `CI` workflow fails or when manually dispatched for a specific PR.

1. Resolve the PR from the failed workflow run.
2. Load policy from the default branch, not from the PR.
3. Require an internal trusted branch, trusted author, `autofix:allowed`, safe paths, size limits, and both required secrets.
4. Limit attempts to the policy maximum, currently two per PR.
5. Checkout the exact head without persisted credentials.
6. Download failed CI logs and install npm dependencies with lifecycle scripts disabled.
7. Run Codex with `sandbox: workspace-write`, `safety-strategy: drop-sudo`, and an explicit protected-path prohibition. `danger-full-access` and the `unsafe` safety strategy are forbidden.
8. Reject edits outside the allowed boundary or unrelated to the original PR, focused tests, or a decision record.
9. Run package-lock alignment, lint, typecheck, unit tests, and build.
10. Verify that the remote head has not moved, then push one repair commit to the same branch.
11. Let every required GitHub check rerun on the new exact head.

Autofix never merges, synchronizes with `main`, resolves conflicts, approves, or resolves review threads.

## Vercel rate-limit behavior

Vercel quota and rate-limit signals do not block repository delivery. When Vercel reports `Deployment rate limited`, `build-rate-limit`, `retry in 24 hours`, `upgradeToPro=build-rate-limit`, or an equivalent deployment-quota condition:

1. Continue implementation, branch creation, commits, push, and PR creation.
2. Continue every available GitHub-side quality and security check.
3. Do not infer a code defect from the Vercel-only provider status.
4. Do not run Codex autofix merely to change a provider quota result.
5. Add an `External deployment status` section using `.github/agents/pr-creation-with-vercel-limit.prompt.md`.
6. Record deployment as `BLOCKED` and production validation as `NOT VERIFIED` for the exact SHA.
7. Keep the final merge human-controlled and branch-protection-authoritative.

A required failed Vercel check cannot be bypassed. A non-required Vercel status does not prevent PR creation, but it never counts as deployment evidence.

## Protected domains

The canonical policy blocks autonomous repair for, at minimum:

- GitHub workflows, actions, and agent prompts;
- authentication, authorization, RBAC, RLS, tenancy, middleware, and Supabase authority;
- billing, Stripe, webhooks, entitlements, and payment state;
- migrations and SQL;
- security and release scripts;
- secrets, production configuration, audit evidence, and legal material;
- package manifests and agent-governance files.

These PRs remain entirely manual even if checks are green.

## Conflict behavior

Neither the classifier nor autofix updates branches or resolves merge conflicts. A conflicting or behind branch requires a human or an explicitly authorized coding-agent change, followed by fresh exact-head checks and approval.

## Failure handling

- Missing repair token: classify only; do not push.
- Vercel quota: create/update the PR and record the provider blocker truthfully.
- Other provider failure: do not modify code merely to obtain a green status.
- No safe Codex change: stop without a commit.
- Boundary violation: fail before verification or push.
- Stale branch during repair: refuse the push.
- Required checks or approval missing: leave the PR open.
- Merge refusal: the human owner reviews GitHub's branch-protection reason; no automation bypass is available.

## Rollback

Revert:

- `.github/workflows/pr-autopilot.yml`;
- `.github/workflows/codex-autofix.yml`;
- `.github/pr-autopilot-policy.json`;
- associated tests and governance documentation.

Then revoke the same-branch repair token. No application runtime, database, billing, tenant, or production-data rollback is required.
