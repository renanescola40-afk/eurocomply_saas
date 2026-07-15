# ADR: PR classifier, bounded CI autofix, and human-only merge

- Date: 2026-07-15
- Status: Proposed
- Decision owners: repository owner and engineering steward

## Context

The repository contains extensive CI, security gates, a senior-agent queue, and a Codex autofix workflow. Pull requests still require repeated diagnosis and review coordination. The previous autofix workflow used pnpm in an npm repository, contained a hard-coded historical error, opened a second repair PR, and did not enforce a current risk boundary.

The repository is public and protects authentication, tenancy, Supabase RLS, billing, audit evidence, releases, and production configuration. A `pull_request_target` workflow with repository write, branch-update, or merge authority would create a governance escalation path: automation could rewrite the contract that limits its own authority and then merge that change.

Vercel also returns provider-only failures such as build-rate limits, deployment quotas, plan limits, and temporary unavailability. Those signals do not prove a repository defect and must not prevent reviewable work from reaching a PR. They also must not be represented as successful deployment evidence.

## Decision

Introduce two default-branch-controlled workflows and one machine-readable policy:

1. `Codex PR Auto-Fix` may repair only trusted, same-repository, bounded, low-risk PRs after `CI` failure. It uses dynamic failure logs, modifies the same branch, allows at most two attempts, verifies locally, checks the remote head, and pushes one repair commit with a repository-scoped token.
2. `PR Autopilot Classifier` is a read-only risk classifier. It loads policy from the trusted default branch, never checks out PR code, and may maintain risk or autofix-eligibility labels.
3. The classifier cannot update branches, resolve conflicts, approve, resolve review conversations, enable auto-merge, merge, or use administrator bypass.
4. `.github/pr-autopilot-policy.json` explicitly declares `automaticMerge: false`, `automaticBranchSync: false`, `administratorBypass: false`, and `finalMergeActor: human-owner`.
5. The final merge is always an explicit human-owner action after exact-head required checks, independent approval, resolved conversations, clean merge state, and absence of owner-only blockers.
6. Vercel quota or rate-limit signals do not stop branch creation, commits, push, or PR creation. They are recorded as `BLOCKED — external provider quota/rate limit`, do not trigger code autofix by themselves, and do not count as production validation.
7. Codex runs with `sandbox: workspace-write` and `safety-strategy: drop-sudo`; `danger-full-access` and `unsafe` are forbidden.

High-risk paths are fail-closed and cannot be overridden by labels.

## Security rationale

`pull_request_target` may receive write permissions and secrets, so the classifier receives neither repository-content write nor a dedicated push/merge token. It never checks out or executes PR code.

The autofix workflow checks out code only after default-branch policy authorization. Codex does not receive the repair token. Its output is constrained by a deterministic changed-path boundary, package-lock/lint/typecheck/test/build verification, and remote-head comparison before the isolated push step.

The repair token exists only to push a verified same-branch commit that can trigger fresh downstream checks. It has no classifier, approval, branch-sync, merge, administrator, provider, production, or customer-data authority.

Separating PR delivery from deployment evidence prevents two unsafe shortcuts: changing code to satisfy a provider quota and falsely claiming that an unavailable deployment succeeded.

## Rejected alternatives

- **Direct agent push to `main`:** bypasses review and branch evidence.
- **Administrator bypass:** can merge without the controls the repository claims to enforce.
- **Automatic branch synchronization:** a syntactically clean merge can still alter auth, billing, tenancy, or runtime behavior and invalidates exact-head evidence.
- **Automatic conflict resolution:** has the same semantic-risk problem with even less confidence.
- **Automatic merge after green checks:** approval and path classification do not grant an automation authority to perform the final governance action.
- **Self-modifying merge controller:** automation must not expand its own authority by rewriting and merging the policy that constrains it.
- **Open a second repair PR:** fragments evidence and leaves the original PR blocked.
- **Refuse PR creation during Vercel quota:** provider quota is not repository evidence.
- **Ignore or fake Vercel status:** creates false deployment evidence.
- **Use `danger-full-access` or `safety-strategy: unsafe`:** unnecessary for bounded repair.
- **Disable Actionlint:** hides workflow defects instead of correcting them.

## Consequences

- Low-risk CI failures may be repaired on the original branch without owner intervention.
- Every PR still requires a human final merge action.
- Branch synchronization and conflict resolution remain deliberate, reviewable changes followed by fresh checks and approval.
- High-risk PRs remain entirely manual.
- Reviewable PRs are still created when Vercel is quota-blocked.
- Vercel deployment and production validation remain explicitly blocked until the exact SHA deploys successfully.
- Two repository secrets are required for complete same-branch repair operation.
- The policy is conservative and may classify harmless changes for manual review.

## Validation

Repository validation must include:

- workflow YAML parsing and Actionlint;
- workflow permission and sensitive-pattern gates;
- source-contract tests proving trusted policy loading and no PR checkout in the classifier;
- negative tests proving absence of `pulls.merge`, `pulls.updateBranch`, auto-merge, administrator bypass, classifier content-write permission, and classifier repair/merge token;
- tests for the bounded Codex workspace sandbox, attempts, path restrictions, verification, stale-head refusal, and same-branch push;
- tests for truthful Vercel quota PR-delivery behavior;
- normal required CI on the exact PR head.

Repository checks do not prove production behavior, provider health, deployment success, or customer impact.

## Rollback

Revert the classifier, autofix workflow, policy, source-contract tests, governance documents, Vercel prompt/template updates, and this ADR. Revoke the repair token. The SaaS runtime and database are unaffected.
