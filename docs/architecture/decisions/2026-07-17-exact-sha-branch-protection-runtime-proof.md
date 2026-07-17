# Exact-SHA branch protection runtime proof

- Date: 2026-07-17
- Status: Proposed
- Scope: P0 branch protection and required-check evidence for `main`
- Priority: P0 release governance

## Context

Enterprise release policy requires durable proof that `main` is protected and that the documented required status checks are actually enforced. The committed evidence record remains an `Exception`; documented policy and source-level validation are not equivalent to live GitHub configuration evidence.

The previous manual workflow queried branch protection but:

- did not require an assessed release SHA;
- did not prove that the checked-out commit was the current `main` head;
- stored API error messages in the artifact;
- generated `Exception` evidence without failing the workflow;
- did not validate the generated artifact before upload.

That made the workflow useful as a draft collector but insufficient as a fail-closed P0 runtime proof.

## Decision

The branch protection evidence workflow must be manually dispatched with the full release SHA and must:

1. check out that exact SHA with persisted credentials disabled;
2. verify the local checkout matches the requested SHA;
3. query the GitHub API for the current `main` head and require an exact match;
4. query live branch protection configuration;
5. verify pull-request review, CODEOWNERS, stale-review dismissal, conversation resolution, strict required checks, force-push blocking, deletion blocking, direct-push restriction, and at least one approval;
6. match every documented required status check through its canonical name or accepted UI alias;
7. write a redacted artifact without raw API payloads, tokens, or access-granting values;
8. validate the artifact with a dedicated fail-closed contract;
9. fail the workflow for API access failure, stale SHA, incomplete controls, missing checks, malformed evidence, or unsafe evidence integrity;
10. upload the artifact even when validation fails so operators can diagnose the blocker.

A successful artifact uses `Complete/passed`. Every other state remains `Open` and blocks enterprise release.

## Consequences

A `BRANCH_PROTECTION_READ_TOKEN` with sufficient read access may still be necessary because the default workflow token may not read repository administration settings. Missing permission is reported as a sanitized status-class failure and remains a P0 blocker.

The workflow cannot configure branch protection and does not weaken or bypass repository rules. It only records and validates live configuration for the exact current `main` SHA.

This implementation prepares trustworthy evidence generation but does not mark the committed evidence record complete by itself. The protected workflow must run after merge for the exact final release SHA, and its artifact must be reviewed and promoted through the repository's evidence process.

## Evidence boundary

Repository tests prove schema and fail-closed behavior only. They do not prove current GitHub settings, administrator permissions, provider availability, a production deployment, or external assurance.

## Rollback

Revert the workflow, validator, tests, and this decision record. Reversion restores the draft-only evidence collector, which can succeed while producing incomplete or exception evidence and should not be used for an enterprise Go decision.
