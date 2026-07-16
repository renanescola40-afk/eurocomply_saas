# ADR-0091: Bound GitHub checks evidence API calls

- Status: Accepted
- Date: 2026-07-16
- Owners: Release Engineering / Security Engineering

## Context

`scripts/enterprise/capture-github-checks-evidence.mjs` collects exact-SHA workflow and CI-step results from the GitHub Actions API for the enterprise-readiness evidence artifact.

The collector already had an overall polling deadline, but each individual `fetch` call had no application timeout. A stalled API request could therefore outlive the configured polling window. Successful responses were also parsed with `Response.json()`, which buffers the complete body before the collector can enforce any size boundary.

This is a P1 release-control reliability gap because the script runs inside the evidence path used to decide whether required checks are verified for one exact commit. The gap does not prove an exploit or a production incident, but it creates an avoidable unbounded provider boundary in a trusted release process.

## Decision

For every GitHub API request made by the collector:

1. Apply a 15-second application timeout by default, configurable through `GITHUB_CHECKS_REQUEST_TIMEOUT_MS`.
2. Reject redirects.
3. Reject a declared `Content-Length` greater than 1 MiB.
4. Stream the response and count raw bytes when the length is absent or inaccurate.
5. Cancel the stream immediately after the 1 MiB boundary is exceeded.
6. Decode UTF-8 strictly and parse JSON only after the bounded read completes.
7. Fail closed on timeout, missing body, oversized body, invalid UTF-8, malformed JSON, redirects, or non-success HTTP status.

The required workflow list, exact-head-SHA filter, CI step mapping, evidence schema, and PASS/NOT_VERIFIED semantics remain unchanged.

## Consequences

### Positive

- A stalled GitHub API call can no longer hold the evidence collector indefinitely.
- Unexpectedly large or malformed provider responses are rejected before unbounded buffering or JSON parsing.
- Redirects cannot silently move the authenticated request to another origin.
- Existing evidence integrity rules remain intact.

### Risks and limitations

- A legitimate GitHub API response larger than 1 MiB will fail closed. The current requests are limited to at most 100 workflow runs or jobs and are expected to remain well below that threshold.
- Temporary GitHub latency above the configured request timeout will fail the collector rather than produce incomplete evidence.
- This decision does not prove GitHub availability, production deployment, restore capability, tenant isolation, or provider health.

## Validation

A repository contract test verifies the timeout, redirect rejection, streamed byte limit, strict decoding, bounded JSON parsing, and preservation of exact-SHA evidence semantics.

No runtime evidence, audit result, penetration-test result, or production claim is created by this change.

## Rollback

Revert the three commits in the pull request. No database migration, configuration migration, secret rotation, or runtime rollback is required.
