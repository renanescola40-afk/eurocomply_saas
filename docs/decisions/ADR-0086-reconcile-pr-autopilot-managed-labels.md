# ADR-0086: Reconcile PR Autopilot managed labels

- **Status:** Accepted
- **Date:** 2026-07-16
- **Decision owners:** Engineering and Security
- **Scope:** `.github/workflows/pr-autopilot.yml`

## Context

The PR Autopilot classifier is a trusted-default-branch `pull_request_target` workflow that classifies pull requests without checking out untrusted PR code. It manages four repository labels: blocked, high risk, manual review, and bounded autofix allowed.

The previous implementation added and removed only a subset of those labels in each branch of the classifier. A pull request that was initially high risk could therefore retain `blocked`, `high-risk`, or `manual-review` after a later synchronize event made the current diff low risk. A pull request that became low risk but was not autofix-eligible could also retain stale managed labels. Those labels are operational inputs for human review and automation policy, so stale state can misrepresent the current exact-head classification and unnecessarily block release work.

## Decision

Treat the classifier-owned labels as a reconciled set derived from the current pull request state.

For every classification run:

1. Compute the desired managed-label set from the current repository, author, branch, changed paths, and size limits.
2. Remove classifier-owned labels that are present but no longer desired.
3. Add desired classifier-owned labels that are missing.
4. Leave all non-classifier labels untouched.

The resulting states are:

- high risk: `blocked`, `high-risk`, and `manual-review`;
- low risk and bounded-autofix eligible: `autofix-allowed`;
- low risk and not autofix eligible: no classifier-managed labels.

The workflow still has no checkout, no contents write permission, no branch synchronization authority, no administrator bypass, and no merge authority.

## Impact

Classification labels now describe the current pull request state instead of accumulating history from earlier commits. Scheduled and event-driven runs converge to the same result. Human reviewers retain final merge authority, and unrelated labels are preserved.

## Risks

A policy or classifier defect could remove a classifier-owned label that a person expected to remain as a historical marker. Those labels are defined as current-state automation labels, not permanent audit records; GitHub events and workflow logs remain the historical record. The change deliberately does not remove labels outside the managed set.

This ADR does not claim that label state proves CI success, security approval, or merge readiness. Branch protection and exact-head checks remain authoritative.

## Validation

- Contract tests assert that all managed labels are reconciled from a single desired set.
- Existing security contracts continue to prohibit checkout of PR code, contents write permission, automatic branch synchronization, and automatic merge.
- GitHub Actions checks on the pull request are the authoritative executable validation; the change must not be marked complete or merged without green required checks.

## Rollback

Revert the workflow, contract-test, and ADR commits. The prior additive label behavior will resume. No runtime data, schema, secret, RLS, RBAC, application route, or customer data migration is involved.
