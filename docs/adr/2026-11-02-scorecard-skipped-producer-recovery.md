# Ignore no-op producer completions before allocating scorecard runners

- Date: 2026-11-02
- Status: Proposed in PR #2592
- Scope: GitHub Actions Enterprise Readiness Scorecard Stabilizer

## Observed issue

The private GitHub repository has an account-level GitHub Actions admission blocker. Owner-provided billing screenshots display an Actions budget of USD 0.00, hard-stop enabled, usage blocked at 100%, and a missing payment method. A real rerun failed before starting any steps (runner_id=0). This account setting cannot be repaired from a repository PR.

The scorecard stabilizer subscribes to the completion of 27 producer workflows. When one producer is skipped, GitHub still creates a downstream workflow_run event and the stabilizer's single job can request a runner even though no authoritative evidence has appeared. With runner admission blocked, these events amplify the number of failing check records.

## Change

For workflow_run triggers, skip the stabilizer job when the upstream conclusion is precisely `skipped`. Retain all 27 producer subscriptions and existing main-branch, exact-SHA, recursive-dispatch, concurrency, security, production-gate, and manual recovery logic. All non-skipped conclusions, including genuine failures, remain eligible for the existing fail-closed reconciliation.

This is a **job-level** filter. GitHub can still create a workflow run object; this change does not prevent the event itself or fix account billing.

## Fail-closed boundaries

- A skipped producer does not become PASS; no Enterprise control or release approval is promoted.
- An upstream failure continues to be handled by the original stabilizer logic, which may report a negative result.
- The authoritative Enterprise scorecard and required security workflows are not disabled.
- No required check, review rule, release gate or production environment is bypassed.
- No paid runner, payment method, budget change, deployment, production write or merge is authorized.

## Verification and rollback

- Structural checks verify that the job-level guard executes before runner allocation and preserves the original trust boundaries.
- Run `node --test tests/ci/workflow-run-main-branch-contract.test.mjs` and existing enterprise stabilizer tests on the PR SHA when a permitted runner or local environment is available.
- Validate the resulting event count and actual runner minutes after the account-level blocker is resolved.
- Revert the commit on PR #2592 to restore the previous behavior.

This proposed fix must not be called GitHub Actions recovery until a real runner successfully executes code with genuine required checks.

## Additional containment: Codex Auto-Fix

Codex PR Auto-Fix previously requested a runner on any failed CI completion, including a direct push to `main` where there is no PR to repair. Limit the auto-fix job to failed `CI` runs whose original event was `pull_request`. Keep the manual `workflow_dispatch` entry point and the original authorization, token, same-branch and attempt-count guards. This pre-run guard does not disable CI itself, cannot distinguish billing-blocked jobs from failed test jobs, and does not prevent GitHub from recording the downstream workflow_run event. The rule avoids unnecessary runner admission and incidental write-token exposure on `main` CI failures.
