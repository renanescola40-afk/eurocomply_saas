# Enterprise Privileged Access Evidence Contract

| Control | Repository evidence | Runtime evidence required |
| --- | --- | --- |
| Tenant isolation | organization-scoped tables, queries and RPC results | cross-tenant denial against production-like data |
| Separation of duties | requester self-approval rejection | two independent real administrator approvals |
| Time-bounded access | 15-minute to 24-hour schema and API bounds | scheduler expiry within operational SLO |
| Duplicate prevention | partial unique active-request index | concurrent request race test |
| Strong authorization | `manage_team`, trusted mutation and step-up guards | configured MFA/step-up provider proof |
| Fail-closed throttling | distributed rate-limit configuration | production rate-limit backend evidence |
| Immutable lifecycle evidence | append-only event table and restricted grants | audit export and retention verification |
| Safe worker execution | internal cron authorization and bounded batches | signed scheduler invocation evidence |
| Incident response | privileged-access incident runbook | tabletop exercise and operator sign-off |
| Scale | `SKIP LOCKED` and batch limit up to 500 | 10,000-member load and recovery test |

Repository CI may mark the repository controls as passed. Provider, scheduler, production database and human-review evidence must remain `EXTERNAL_VALIDATION_REQUIRED` until captured from the configured environment.