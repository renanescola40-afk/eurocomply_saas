# ADR: Exact-SHA multi-producer P0 runtime aggregation

- Status: Accepted
- Date: 2026-08-04
- Updated: 2026-08-09
- Decision owners: Security Engineering and Release Engineering

## Context

The P0 runtime register derives release status from canonical evidence files in one isolated GitHub Actions workspace. Runtime controls are proven by separate protected producer workflows. Their artifacts are immutable and intentionally are not committed back to the repository.

The original implementation aggregated only upload-scanner and branch-protection artifacts. As dedicated Auth/RBAC, Supabase RLS and production-runtime producers were added, those exact-SHA proofs could pass independently while the P0 register still reported the corresponding controls as `Open`. That made the register conservative but materially stale.

A P0 run triggered by only one producer cannot assume another producer's evidence exists in its checkout. Reading legacy committed evidence also cannot prove the current release SHA. Manual status edits, direct repository writes and evidence copied from a pull request are not acceptable promotion paths.

## Decision

`P0 Runtime Evidence` remains the read-only aggregator for protected runtime producer artifacts.

It listens only to successful `push` or trusted `workflow_dispatch` completions on `main` from P0-relevant protected producers currently including:

- `RISCK COMPLY Upload Security CI`;
- `Branch Protection Runtime Proof`;
- `Auth RBAC Tenant Proof`;
- `Supabase Live RLS Validation`;
- `Production Runtime Proof`.

For the exact producer SHA, the aggregator:

1. checks out that immutable SHA;
2. treats the triggering producer artifact as required;
3. looks up other producers only by the same full SHA and stable workflow identity;
4. accepts only successful `main` runs from `push` or trusted `workflow_dispatch`;
5. accepts only canonical, unexpired, SHA-bound artifacts;
6. validates workflow-run provenance and each evidence contract before writing ephemeral canonical evidence;
7. removes production-owned stale evidence before discovery where absence could otherwise be confused with current proof;
8. generates the P0 register only after all downloaded evidence has passed the existing canonical validators.

A missing or failed optional producer leaves its control `Open`. It does not fail unrelated evidence and does not promote a placeholder. A producer that is the trigger is required, so a malformed artifact cannot silently yield a successful aggregation run.

## Production runtime bundle

`Production Runtime Proof` emits a single exact-SHA artifact containing the canonical production-runtime aggregate plus deployment smoke, runtime release-SHA binding, security headers and no-store evidence. The aggregator imports the complete validated bundle so the P0 deployment-smoke control is not lost after the producer has already proved it.

The production aggregate remains the trust anchor for bundle promotion; the P0 file validators then independently validate the imported deployment-smoke evidence against the assessed SHA.

## Security boundaries

- Pull-request workflow artifacts never satisfy `main` P0 evidence.
- Failed producer workflows never promote runtime evidence.
- Producer and aggregator workflows retain read-only repository permissions.
- No workflow commits evidence or modifies the policy register.
- GitHub API responses, artifact sizes, ZIP entry counts and evidence sizes are bounded by the hardened fetchers.
- Absolute paths, traversal, backslashes, duplicate evidence entries and malformed JSON are rejected where supported by each producer contract.
- Tokens, raw GitHub API payloads, ruleset names, customer data and access-granting values are not retained.
- Missing Auth/RBAC fixtures, incomplete branch-protection settings or absent provider configuration remain real `Open` blockers; aggregation never converts those conditions into PASS.
- A branch-protection token that is missing or lacks permission produces `Open`/failed evidence; it cannot be converted into `Complete` by fallback text.
- Ruleset fallback is accepted only for active rules targeting `main` with no bypass actor.

## Branch-protection promotion

The producer emits `branch-protection-runtime-proof-<sha>`. The aggregator derives two ephemeral views from the same validated source:

- `branch-protection-validation.json` for the enterprise scorecard;
- `branch-protection-required-checks.json` for the two canonical P0 controls.

Both views remain bound to the same repository, branch, current-main SHA and producer run ID. The P0 view must satisfy the freshness validator, all required status checks, all protection flags, release blockers, secret-log policy and SBOM metadata.

## Consequences

A successful merge does not itself close a runtime control. Closure occurs only when its protected producer runs for the current `main`, emits valid `Complete/passed` evidence, and the aggregator validates the artifact for that same SHA.

This allows already-proven Supabase tenant isolation and production deployment smoke to be reflected by the authoritative P0 register while leaving externally blocked controls such as missing Auth/RBAC fixtures or incomplete branch-protection governance open.

When real settings are incomplete, the producer or canonical validator fails closed and the enterprise decision remains `NO_GO`.

## Rollback

Revert the producer-list expansion, aggregator integration, production-bundle promotion, ADR and contract tests together. After rollback, controls not imported by the old aggregator return to `Open`; no committed or historical evidence may be substituted for current exact-SHA runtime proof.
