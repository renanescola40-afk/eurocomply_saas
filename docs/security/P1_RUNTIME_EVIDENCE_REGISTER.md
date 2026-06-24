# P1 Runtime Evidence Register

This register tracks high-priority runtime evidence that supports enterprise readiness after P0 release blockers are closed. P1 items do not override P0 gates; any P0 Open, Exception, or TargetValidationRequired item keeps the release at No-Go for enterprise.

## Current release assessment

- Release name: EuroComply Operational Release Candidate - 2026-06-24
- Assessment date: 2026-06-24
- Current final decision inherited from P0 register: **No-Go**
- P0 source of truth: `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md`

## Evidence status

| Evidence item | Status | Required evidence | Owner | Expiry / next action |
| --- | --- | --- | --- | --- |
| Audit-chain operational replay runbook exercised | TargetValidationRequired | After `scripts/security/run-audit-chain-live-validation.mjs` passes, attach reviewer notes showing how to replay `scripts/security/verify-audit-chain.mjs` from a signed evidence export and how to triage `previous_hash_mismatch`, `event_hash_mismatch`, `missing_previous_hash`, and `signature_mismatch`. | Security reviewer | Before enterprise customer evidence handoff |
| Audit-chain evidence export customer-verifier smoke | TargetValidationRequired | Export a signed evidence pack from the protected endpoint after RBAC + step-up and validate the exported integrity block in the verifier UI/CLI without exposing secrets. | Compliance owner | Before enterprise customer evidence handoff |
| Audit critical-event coverage sampling | TargetValidationRequired | Sample target environment audit rows for login/logout, RBAC denied, origin denied, step-up, billing, uploads/downloads, exports, team/document/risk/vendor/task changes, GDPR delete, webhook failures, and security settings. | Compliance owner | Before enterprise pilot |
| Audit-chain alerting and runbook owner | Open | Confirm alert destination and owner for failed chain verification, signing secret missing, transactional append unavailable, and evidence export signing unavailable. | SRE owner | Before enterprise pilot |

## P1 audit-chain operating rule

P1 evidence must never be used to soften P0 controls. If target live validation is incomplete, the only acceptable state for audit-chain P1 items is `TargetValidationRequired` or `Open`.
