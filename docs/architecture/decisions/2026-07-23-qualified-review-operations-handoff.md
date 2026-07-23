# ADR: Qualified Review Operations Handoff

## Status

Accepted for implementation.

## Context

Product implementation, automated CI verification and machine-verifiable runtime evidence can reach 100% without a human legal opinion. Final completed coverage cannot. Eight workstreams require qualified legal or methodology review with a combined weight of 51 points.

Treating those reviews as ordinary repository files would create two unacceptable risks:

1. automation could fabricate completion;
2. stale, conflicted or cross-SHA opinions could be credited.

## Decision

Introduce a separate exact-SHA operations layer that:

- maps all eight review requirements to explicit reviewer expertise;
- generates one bounded handoff pack per review;
- requires independence and conflict declarations;
- binds every handoff to the assessed SHA;
- uses deterministic SHA-256 integrity digests;
- emits retained artifacts rather than committing generated packs;
- forbids committed `ACCEPTED` status without a validated evidence package;
- keeps the release decision at `NO_GO` until the existing strict qualified-review validator accepts every real package.

## Consequences

### Positive

- the final 51 points become operationally assignable;
- reviewers receive consistent scope and output requirements;
- no legal approval is fabricated;
- exact-SHA lineage and integrity are preserved;
- raw privileged material stays outside the repository.

### Negative

- completion still depends on external people and commercial/legal coordination;
- reviewer availability and cost cannot be solved in code;
- a new target SHA may require review refresh or explicit lineage validation.

## Security boundary

The workflow has read-only repository permission, uses immutable action pins, generates sanitized artifacts, and retains no customer data, credentials, raw legal advice or provider secrets.

## Rollback

Revert the operations registry, generator, schema, workflow, tests and runbook as one unit. Existing accepted review evidence and product workflows remain unchanged.
