# ADR-0074: Bound per-organization metric snapshot work

- Status: Proposed
- Date: 2026-07-16
- Priority: P1 SRE and background-job reliability

## Context

`/api/internal/metric-snapshots` processes a bounded, rotating batch of organizations. For each organization it builds a dashboard summary and records a snapshot sequentially.

The batch size was capped, but neither per-organization operation had an application-level deadline. A stalled database or query path could therefore keep the internal request pending until the hosting platform terminated it, preventing the remaining organizations in the selected batch from being attempted and obscuring which organization caused the stall.

This finding is based on repository source. It does not claim that a production timeout, outage, data loss, external audit finding, or penetration-test result occurred.

## Decision

Apply a five-second deadline to the combined summary-and-persist operation for each organization.

When the deadline expires:

- count the organization as failed;
- record the stable failure message `timeout` in the existing batch summary;
- report the error through the existing observability path with a `timedOut` flag;
- continue with the next organization.

Non-timeout failures retain the existing `internal_error` classification.

## Consequences

### Positive

- one stalled organization no longer holds the whole batch until the platform deadline;
- later organizations in the batch can still be attempted;
- timeout failures are distinguishable from other internal failures;
- authentication, fail-closed rate limiting, organization limits, rotation, no-store behavior, and partial-failure response semantics remain unchanged.

### Risks and limitations

- a healthy operation taking more than five seconds is classified as failed;
- `Promise.race` bounds the route's wait but cannot guarantee transport-level cancellation of work already started by the database client;
- timed-out work may settle later, so downstream writes must remain idempotent under the existing snapshot design;
- the chosen threshold should be tuned only with production latency evidence.

## Alternatives considered

### Leave the operations unbounded

Rejected because dependency stalls would continue to consume the request deadline and block the remainder of the batch.

### Add only a whole-job deadline

Not selected for this change because it would stop the batch without identifying the responsible organization and would require additional checkpoint/resume semantics.

### Run all organizations concurrently

Rejected because it would increase database pressure and materially change the job's resource profile.

## Evidence boundary

Evidence consists of repository source, diff, focused regression contracts, and GitHub checks on the exact pull-request SHA. No runtime evidence file is created. This ADR does not prove production execution, latency improvement, provider cancellation, incident recovery, legal compliance, external audit completion, or penetration-test coverage.

## Rollback

Revert the pull request. The job will again await each organization's summary and persistence work without an application-level deadline. No migration, dependency rollback, secret rotation, provider action, or customer-data repair is required.
