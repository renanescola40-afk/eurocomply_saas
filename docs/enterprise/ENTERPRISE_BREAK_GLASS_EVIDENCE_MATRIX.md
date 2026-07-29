# Enterprise Break-Glass Evidence Matrix

| Control | Repository evidence | Runtime evidence required | Status |
|---|---|---|---|
| Tenant isolation | composite tenant foreign keys, server-derived organization scope, forced RLS | cross-tenant negative test against production schema | REPOSITORY_COMPLETE |
| Separation of duties | requester self-approval rejection and unique approver constraint | two real independent approvers | REPOSITORY_COMPLETE |
| Bounded duration | database check and API schema cap at 240 minutes | production expiry timestamps and scheduler run | REPOSITORY_COMPLETE |
| Fail-closed mutation security | trusted mutation, distributed rate limiting and step-up calls | real MFA provider and rate-limit outage proof | REPOSITORY_COMPLETE |
| Durable evidence | append-only event table and SHA-256 previous-hash chain | retained production event chain verification | REPOSITORY_COMPLETE |
| Automatic expiry | service-role RPC with `FOR UPDATE SKIP LOCKED` and bounded batch | scheduled worker execution evidence | REPOSITORY_COMPLETE |
| Manual revocation | tenant-scoped revoke API and mandatory review transition | operator exercise and audit log | REPOSITORY_COMPLETE |
| Post-incident review | dedicated review table and 48-hour review deadline | genuine reviewer findings and remediation | EXTERNAL_VALIDATION_REQUIRED |
| Scale and concurrency | unique open-target index and leased expiry batch | concurrent activation and 10,000-member load test | EXTERNAL_VALIDATION_REQUIRED |
| Incident legitimacy | incident reference and justification required | human incident commander validation | EXTERNAL_VALIDATION_REQUIRED |

## Decision rule

The control may be marked production-complete only when repository evidence and the listed runtime or human evidence are both present for the exact release SHA. Missing external evidence must remain explicit and must not be converted into a synthetic pass.
