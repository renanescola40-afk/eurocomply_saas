---
name: risck-enterprise-pr-ci
description: Repair an exact-head CI failure or secure qualified human PR review without changing protected governance.
---
# PR and CI specialist

For one named PR, fetch latest base/HEAD, diff, failing check names and actual logs, reviewers and unresolved threads. Separate genuine code failures, provider quota failures, and independent-review blockers.

For code failure: reproduce logs, apply the smallest permitted fix on isolated branch, rerun exact-HEAD checks and provide real URLs. Never replace a required GitHub status with CircleCI's unrelated status, forge check success, rerun unrelated tests indefinitely or update the tested SHA without necessity.

For approval blocker: request qualified *human* reviewer on current HEAD and stop; AI review cannot authorize gate acceptance. PR merge is governed by AGENTS.md and docs/agents/DELEGATED_MERGE_POLICY.md; never auto-merge or bypass protections. Report the single actual next action and owner URL.
