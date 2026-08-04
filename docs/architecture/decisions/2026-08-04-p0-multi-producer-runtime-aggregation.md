# ADR: Exact-SHA multi-producer P0 runtime aggregation

- Status: Accepted
- Date: 2026-08-04
- Decision owners: Security Engineering and Release Engineering

## Context

The P0 runtime register derives release status from canonical evidence files in one isolated GitHub Actions workspace. The upload scanner and branch-protection controls are proven by separate protected producer workflows. Their artifacts are immutable and intentionally are not committed back to the repository.

A P0 run triggered by only one producer therefore cannot assume the other producer's evidence exists in its checkout. Reading the legacy committed branch-protection exception also cannot prove the current release SHA. Manual status edits, direct repository writes and evidence copied from a pull request are not acceptable promotion paths.

## Decision

`P0 Runtime Evidence` is the read-only aggregator for protected runtime producer artifacts.

It listens only to successful `push` or trusted `workflow_dispatch` completions on `main` from:

- `RISCK COMPLY Upload Security CI`;
- `Branch Protection Runtime Proof`.

For the exact producer SHA, the aggregator:

1. checks out that immutable SHA;
2. treats the triggering producer artifact as required;
3. looks up the other producer only by the same full SHA and stable workflow identity;
4. accepts only successful `main` runs from `push` or `workflow_dispatch`;
5. accepts exactly one unexpired artifact with the canonical SHA-bound name;
6. validates workflow run provenance before writing ephemeral canonical evidence;
7. generates the P0 register only after all downloaded evidence has passed its canonical validator.

A missing optional producer leaves its control `Open`. It does not fail unrelated evidence and does not promote a placeholder.

## Security boundaries

- Pull-request workflow artifacts never satisfy `main` P0 evidence.
- Producer and aggregator workflows have read-only repository permissions.
- No workflow commits evidence or modifies the policy register.
- GitHub API responses, artifact sizes, ZIP entry counts and evidence sizes are bounded.
- Absolute paths, traversal, backslashes, duplicate evidence entries and malformed JSON are rejected.
- Tokens, raw GitHub API payloads, ruleset names, customer data and access-granting values are not retained.
- A branch-protection token that is missing or lacks permission produces `Open`/failed evidence; it cannot be converted into `Complete` by fallback text.
- Ruleset fallback is accepted only for active rules targeting `main` with no bypass actor.

## Branch-protection promotion

The producer emits `branch-protection-runtime-proof-<sha>`. The aggregator derives two ephemeral views from the same validated source:

- `branch-protection-validation.json` for the enterprise scorecard;
- `branch-protection-required-checks.json` for the two canonical P0 controls.

Both views remain bound to the same repository, branch, current-main SHA and producer run ID. The P0 view must satisfy the freshness validator, all required status checks, all protection flags, release blockers, secret-log policy and SBOM metadata.

## Consequences

A successful merge does not itself close branch protection. Closure occurs only when the producer runs on the new current `main`, reads the real GitHub configuration, emits `Complete/passed`, and the aggregator validates that artifact for the same SHA.

When real settings are incomplete, the workflow fails closed and the enterprise decision remains `NO_GO`.

## Rollback

Revert the producer identity change, aggregator integration, fetcher promotion, validator changes and tests together. After rollback, both branch-protection P0 controls return to `Open`; the legacy exception must never be treated as fresh production proof.
