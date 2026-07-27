# ADR — Qualified Review Control Center

## Status

Accepted for implementation; runtime and human-review evidence remain separate acceptance stages.

## Decision

Use one tenant-scoped control-center projection plus a deterministic TypeScript evaluator. The database view provides operational counts and activity timestamps. The evaluator independently enforces the canonical eight workstreams, exact weights totaling 51, accepted terminal state and fail-closed blocker reporting.

## Security

- security-invoker view;
- organization membership predicate;
- authenticated read only;
- server-side administrative aggregation;
- no anonymous access;
- no direct mutation through the control-center endpoint;
- distributed rate limiting and no-store responses.

## Consequences

Operators gain one coherent view of campaigns, assignments, reviewers, invitations, submissions and decisions. Readiness cannot be inferred from percentages alone and remains false when any canonical workstream is missing, duplicated, misweighted, overdue or not accepted.

## Truth boundary

The control center records workflow state. It does not manufacture reviewers, validate legal opinions, issue certification or represent regulator acceptance.