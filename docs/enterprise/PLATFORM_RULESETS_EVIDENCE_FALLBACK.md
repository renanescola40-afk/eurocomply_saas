# Platform Controls Evidence — Repository Rulesets Fallback

## Purpose

Close the technical evidence gap for `PLATFORM-CONTROLS` when the classic GitHub branch-protection endpoint cannot be read by the protected workflow but equivalent controls are available through GitHub Repository Rulesets.

This fallback does not weaken the Enterprise gate. It changes only the read-only evidence source and remains fail-closed when authorization or field visibility is insufficient.

## Evidence order

1. Resolve the exact checked-out SHA.
2. Build a bounded credential chain: `BRANCH_PROTECTION_READ_TOKEN`, then the workflow-scoped `GITHUB_TOKEN` when the dedicated token is stale, unauthorized or cannot see the requested public repository resource.
3. Read the current `main` SHA from GitHub using the first credential that can prove it.
4. Attempt the classic branch-protection endpoint.
5. When the classic endpoint is unavailable, read active repository and inherited rulesets.
6. Select only rulesets that target `main`.
7. Require explicit visibility of each applicable ruleset's `bypass_actors` field before treating zero bypass actors as proven.
8. Project the cumulative rules into the canonical branch-protection control model.
9. Reject incomplete, stale, bypassable, authorization-ambiguous or SHA-mismatched controls.
10. Emit the existing sanitized evidence contract without token values or raw API payloads.

The fallback exists because the workflow previously selected `BRANCH_PROTECTION_READ_TOKEN || GITHUB_TOKEN` once at process start. A stale dedicated token could therefore return `401` and prevent the otherwise valid workflow token from proving even the current `main` SHA. Credential failure is now retried across the bounded read-only chain instead of turning a stale credential into a false statement that all platform controls are absent.

## Required controls

The cumulative policy must prove all of the following:

- pull requests are required;
- at least one approving review is required;
- CODEOWNERS review is required;
- stale approvals are dismissed;
- review threads must be resolved;
- all canonical status checks are required;
- strict up-to-date status-check policy is enabled;
- non-fast-forward updates are blocked;
- branch deletion is blocked;
- direct updates are restricted through the pull-request rule;
- bypass-actor visibility is explicitly proven for every applicable ruleset;
- no ruleset bypass actor is configured;
- target SHA, checked-out SHA and current `main` SHA are identical.

## Supported rule projection

| GitHub ruleset rule | Canonical control |
| --- | --- |
| `pull_request` | PR requirement, approval count, CODEOWNERS, stale review dismissal and review-thread resolution |
| `required_status_checks` | required check inventory and strict up-to-date policy |
| `non_fast_forward` | force-push blocking |
| `deletion` | branch deletion blocking |
| ruleset conditions | exact applicability to `main` |
| bypass actors | fail-closed bypass detection; the field must be observable, not merely absent |

Rulesets are cumulative. Separate active rulesets may provide review controls and technical immutability controls, but the final combined projection must satisfy the complete policy.

## Credential and visibility boundary

The collector may retry authorization failures with the workflow-scoped GitHub token after the dedicated read token fails. Only credential labels such as `dedicated-read-token` and `github-token` may be retained in evidence; token values are never persisted.

GitHub can omit `bypass_actors` when the caller does not have sufficient ruleset visibility. Therefore an omitted field is not equivalent to an empty array. Ruleset-backed evidence cannot become `Complete/passed` unless bypass-actor visibility is explicitly proven for every applicable ruleset. Missing visibility adds `ruleset_bypass_visibility_unproven` and keeps the control open.

## Truth boundary

A successful artifact proves the configured GitHub repository controls observed for the exact assessed `main` SHA. It does not prove:

- that every human reviewer is independent;
- that an external security review occurred;
- that production deployment approval occurred;
- that Supabase, Stripe or Vercel are healthy;
- that customer tenant isolation passed;
- that the product is legally compliant.

## Failure states

The proof remains `Open` or `blocked` when:

- neither API source can be read by any bounded credential;
- no active ruleset targets `main`;
- a ruleset is only in `evaluate` mode;
- `main` is excluded by conditions;
- bypass-actor visibility cannot be proven;
- any bypass actor exists;
- any required check is absent;
- review or CODEOWNERS requirements are insufficient;
- stale approvals are not dismissed;
- review threads are not required to resolve;
- force pushes or deletion are permitted;
- the SHA is stale or malformed.

## Rollback

Revert the workflow, fallback builder, validator, tests and documentation. The change is read-only and does not alter repository settings, rulesets, branches, pull requests or provider state.
