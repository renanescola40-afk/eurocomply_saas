# Platform Controls Evidence — Repository Rulesets Fallback

## Purpose

Close the technical evidence gap for `PLATFORM-CONTROLS` when the classic GitHub branch-protection endpoint cannot be read by the protected workflow but equivalent controls are available through GitHub Repository Rulesets.

This fallback does not weaken the Enterprise gate. It changes only the read-only evidence source.

## Evidence order

1. Resolve the exact checked-out SHA.
2. Read the current `main` SHA from GitHub.
3. Attempt the classic branch-protection endpoint.
4. When the classic endpoint is unavailable, read active repository and inherited rulesets.
5. Select only rulesets that target `main`.
6. Project the cumulative rules into the canonical branch-protection control model.
7. Reject incomplete, stale, bypassable or SHA-mismatched controls.
8. Emit the existing sanitized evidence contract.

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
| bypass actors | fail-closed bypass detection |

Rulesets are cumulative. Separate active rulesets may provide review controls and technical immutability controls, but the final combined projection must satisfy the complete policy.

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

- neither API source can be read;
- no active ruleset targets `main`;
- a ruleset is only in `evaluate` mode;
- `main` is excluded by conditions;
- any bypass actor exists;
- any required check is absent;
- review or CODEOWNERS requirements are insufficient;
- stale approvals are not dismissed;
- review threads are not required to resolve;
- force pushes or deletion are permitted;
- the SHA is stale or malformed.

## Rollback

Revert the workflow, fallback builder, tests and documentation. The change is read-only and does not alter repository settings, rulesets, branches, pull requests or provider state.
