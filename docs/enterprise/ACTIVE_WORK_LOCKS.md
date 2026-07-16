# Active work locks

| Scope | Files or area | Branch / PR | Mode | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Atomic invitation acceptance | `src/server/actions/invitations.ts`, new invitation RPC migration | `agent/atomic-invitation-acceptance` | Write | Primary engineering agent | Active |
| DAST path canonicalization | P1 register, DAST final gate and contract | #1113 | External branch | Concurrent identity | Checks running |
| Billing entitlement rate-limit gate | API guard scanner and entitlement tests | #1114 | External branch | Primary engineering agent | Checks running |
| Runtime SHA response bound | Runtime SHA verifier and ADR-0090 | #1115 | External branch | Concurrent identity | Checks running |

Do not create another migration or action change for invitation acceptance while the first lock is active. Read-only audits may continue across all areas.
