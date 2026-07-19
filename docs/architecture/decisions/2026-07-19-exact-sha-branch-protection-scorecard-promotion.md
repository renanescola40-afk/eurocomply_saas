# Promote branch protection only from exact-current-main runtime evidence

- Status: Proposed
- Date: 2026-07-19
- Area: Repository governance, release engineering, enterprise evidence
- Control: REL-08

## Context

The repository already contains a strict branch-protection policy, a manual GitHub API evidence workflow and a validator for the generated JSON. That path can prove required pull requests, approvals, CODEOWNERS, stale-review dismissal, conversation resolution, strict required checks, force-push blocking, deletion blocking and direct-push restrictions.

The previous path remained manual and its artifact was not consumed by the Enterprise Readiness Scorecard. A repository file, policy document or successful CI run cannot prove the live GitHub branch-protection configuration. The scorecard must therefore keep REL-08 `NOT_VERIFIED` unless a protected GitHub API observation is bound to the exact current `main` SHA.

## Decision

Add a dedicated `Branch Protection Runtime Proof` workflow that runs for every new `main` SHA and supports an explicit exact-main-SHA dispatch.

The producer:

- checks out the exact requested SHA;
- verifies that it is the current remote `main` head;
- reads live GitHub branch protection through a protected read token or the scoped workflow token;
- evaluates the documented required checks and protection flags;
- writes only a redacted evidence model, never the raw GitHub API response;
- validates the resulting evidence contract;
- uploads an immutable 90-day artifact.

The scorecard consumer:

- selects only a successful producer run for the same repository, `main` branch and exact assessed SHA;
- validates the source workflow run ID against both provenance fields in the evidence;
- rejects expired, missing, malformed, stale, incomplete or sensitive artifacts;
- writes the canonical `branch-protection-validation.json` only after acceptance;
- removes stale canonical evidence when no accepted run exists.

## Consequences

REL-08 can become PASS only after the workflow observes all required controls on the exact current `main` SHA. Pull-request validation remains score-neutral because the producer is not registered on the default branch and no main-bound runtime artifact exists for a feature-branch SHA.

Missing token access, GitHub API denial, an outdated SHA, a missing required check, weak review settings, non-strict status checks, allowed force pushes, allowed deletions or invalid provenance leaves REL-08 `NOT_VERIFIED` or fails the protected proof.

The workflow uses read-only repository permissions. It does not modify branch protection, bypass reviews, merge pull requests or weaken required checks.

## Evidence boundary

This evidence proves the observed GitHub `main` branch-protection configuration and required-status-check set at one exact SHA. It does not prove release approval, deployment approval, production runtime health, provider security, tenant isolation, backup recovery, DAST, penetration testing or legal review.

## Rollback

Revert the producer workflow, builder, artifact fetcher, scorecard integration, tests and this decision together. Remove any imported `docs/security/evidence/runtime/branch-protection-validation.json`; REL-08 then returns to `NOT_VERIFIED` unless another accepted exact-SHA evidence source is implemented.
