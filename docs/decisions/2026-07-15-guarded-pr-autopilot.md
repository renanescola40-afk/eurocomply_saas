# ADR: Guarded PR Autopilot

- Date: 2026-07-15
- Status: Proposed
- Decision owners: repository owner and engineering steward

## Context

The repository already contains extensive CI, security gates, a senior-agent queue, and a Codex autofix workflow. Pull requests still require repeated manual diagnosis, branch synchronization, reruns, and merge actions. The previous autofix workflow used pnpm in an npm repository, contained a hard-coded historical error, opened a separate PR, and did not enforce a current risk boundary.

The repository is public and the existing branch policy protects authentication, tenancy, Supabase RLS, billing, audit evidence, releases, and production configuration. Any privileged automation that reads untrusted PR code or can merge without exact-head checks would create more risk than it removes.

Vercel can also return provider-only failures such as build rate limits, deployment quotas, plan limits, or temporary provider unavailability. Those signals do not prove that the repository change is defective. Treating them as a prohibition on creating a PR causes completed reviewable work to remain invisible and wastes owner time, while treating them as successful deployment evidence would be equally inaccurate.

## Decision

Introduce two default-branch-controlled workflows and one machine-readable policy:

1. `Codex PR Auto-Fix` may repair only trusted, same-repository, bounded, low-risk PRs after `CI` failure. It uses failure logs dynamically, modifies the same branch, allows at most two attempts, verifies the change locally, and pushes with a dedicated repository-scoped token.
2. `PR Autopilot` classifies PRs, maintains labels, synchronizes eligible branches through the GitHub API, and merges only after exact-head success, approval, resolved conversations, and a clean GitHub merge state.
3. `.github/pr-autopilot-policy.json` is loaded from the default branch by privileged workflows and defines trusted identities, size limits, path boundaries, merge requirements, and external-provider handling.
4. Vercel quota or rate-limit signals do not stop branch creation, commits, push, or PR creation. They are recorded as `BLOCKED — external provider quota/rate limit`, do not trigger code autofix by themselves, and do not count as production validation.
5. Merge remains branch-protection-authoritative. A failed required Vercel check cannot be bypassed; a non-required provider status does not prevent PR delivery.
6. Codex runs through the official Action with `sandbox: workspace-write` and `safety-strategy: drop-sudo`. This retains a workspace-bounded writable execution model while remaining compatible with the repository's current Actionlint action metadata.

High-risk paths are fail-closed and cannot be overridden by labels. The coding agent itself never receives merge authority.

## Security rationale

`workflow_run` and `pull_request_target` can receive secrets and write permissions. The controller therefore never checks out PR code. The autofix workflow checks out code only after default-branch policy authorization and never exposes the merge token to Codex or verification commands. Checkout credentials are not persisted.

The Codex step cannot use `danger-full-access` or the `unsafe` safety strategy. It is followed by a deterministic changed-path boundary, full local verification, remote-head comparison, and an isolated final push step. The Actionlint-compatible workspace sandbox is a compatibility choice, not broader repository or production authority.

The dedicated token is used only at the final push or guarded API-controller step so downstream CI and deployment events are generated. It is not a production credential and must be limited to this repository.

Separating PR delivery from deployment evidence avoids two unsafe shortcuts: changing code to satisfy a provider quota condition and falsely representing an unavailable deployment as successful.

## Rejected alternatives

- **Direct agent push to `main`:** rejected because it bypasses review and branch evidence.
- **Administrator branch-protection bypass:** rejected because it can merge without the controls the repository claims to enforce.
- **Automatic conflict resolution:** rejected because syntactically valid resolutions can silently alter auth, billing, tenancy, or runtime behavior.
- **Use only `GITHUB_TOKEN`:** rejected because token-generated changes do not reliably trigger the downstream validation chain.
- **Auto-merge every green PR:** rejected because path-only classification cannot safely approve security, data, payment, or production changes.
- **Open a second repair PR:** rejected because it fragments evidence and leaves the original PR blocked.
- **Refuse to create a PR while Vercel is rate-limited:** rejected because provider quota is not repository evidence and PR review can proceed independently.
- **Ignore or fake the Vercel result:** rejected because it would create false deployment evidence and could bypass a required check.
- **Use `danger-full-access` or `safety-strategy: unsafe`:** rejected because neither is necessary for bounded repository repair.
- **Suppress the Actionlint input error:** rejected because changing to an officially supported workspace sandbox keeps the check meaningful without an ignore rule.

## Consequences

- Low-risk CI failures can be repaired without owner intervention.
- Eligible PRs no longer require a separate merge click after approval and green checks.
- High-risk PRs remain intentionally manual.
- Reviewable PRs are still created when Vercel is quota-blocked.
- Vercel deployment and production validation remain explicitly blocked until the exact SHA deploys successfully.
- Two repository secrets are required for complete operation.
- Branch protection approval remains a human control; this system does not create a fake independent reviewer.
- The policy is conservative and may initially classify some harmless changes as manual.

## Validation

Repository validation must include:

- workflow YAML parsing and Actionlint;
- workflow permission and sensitive-pattern gates;
- source-contract tests for trusted policy loading, no checkout in the privileged controller, exact-head merge, review/check/thread requirements, bounded Codex workspace sandbox, bounded attempts, blocked paths, and Vercel quota PR-delivery behavior;
- normal required CI on the exact PR head.

No production behavior, provider health, deployment success, or customer impact is claimed by repository checks.

## Rollback

Revert the workflows, policy, source-contract tests, governance updates, prompt, PR template changes, and this ADR. Revoke the dedicated token. The SaaS runtime and database are unaffected.
