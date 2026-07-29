# Enterprise Access Release Evidence

| Control | Repository evidence | Completion condition |
| --- | --- | --- |
| Privileged access | migration, service, tenant APIs, tests, workflow, runbook | dedicated and global gates pass |
| Break-glass access | migration, service, request/decision/revoke/expiry APIs, tests, workflow, runbook | dedicated and global gates pass |
| Tenant isolation | composite ownership checks, forced RLS, service-role persistence | RLS and BOLA gates pass |
| Mutation security | trusted mutation, bounded body, fail-closed rate limit, step-up | API guard and security gates pass |
| Expiry safety | bounded workers and `FOR UPDATE SKIP LOCKED` | closeout contract passes |
| Incident response | revocation and post-incident runbooks | documents remain versioned and discoverable |
| Release control | CI, Production Gate, Security CI, Scorecard | required checks succeed before merge |

## Truth boundary

This matrix proves repository intent and automated contract coverage. It does not claim that production migrations, schedules, MFA, notifications or human reviews have occurred unless separate runtime evidence exists.
