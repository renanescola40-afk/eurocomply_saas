# Protect and serialize public production validation

Date: 2026-07-15  
Status: Proposed

## Context

The manual `Public Production Final` workflow consumes production-scoped secrets and produces release evidence for a promoted commit. The workflow did not declare the repository's protected `Production` environment and did not define concurrency. Two operators could therefore start overlapping validations, and environment reviewers could not consistently gate access to production secrets through the workflow contract itself.

## Decision

- bind the runtime-validation job to the `Production` GitHub environment;
- serialize public production validation with a single non-cancelling concurrency group;
- retain exact commit/build SHA binding to `github.sha`;
- include the SHA in the artifact name;
- retain evidence for 90 days;
- fail artifact upload when no evidence files exist.

## Security and operational impact

Environment protection can require owner or reviewer approval before production secrets are released. Serialization prevents two release validations from racing over the same production and rollback targets. An active production validation is never cancelled by a later dispatch.

This change does not configure the GitHub environment, its reviewers, or its secrets. Repository owners must verify those settings in GitHub. It does not deploy automatically and does not claim production health.

## Risks and trade-offs

- a missing or misconfigured `Production` environment will block the workflow;
- queued validations may wait for an earlier run to finish;
- the workflow still depends on owner-supplied production and rollback inputs;
- repository protection cannot prove that provider consoles or customer traffic are healthy.

## Rollback

Revert this change. Doing so removes the workflow-level environment and serialization requirements. Keep the release decision at No-Go until an equivalent protected execution boundary is restored.
