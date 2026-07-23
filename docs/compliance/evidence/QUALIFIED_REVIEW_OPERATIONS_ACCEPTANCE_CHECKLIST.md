# Qualified Review Operations Acceptance Checklist

## Repository controls

- [x] Eight review requirements mapped exactly once.
- [x] Combined review weight fixed at 51 points.
- [x] Exact-SHA binding required.
- [x] Deterministic SHA-256 integrity digest generated.
- [x] Committed `ACCEPTED` status rejected without validated evidence.
- [x] Read-only workflow permissions.
- [x] Immutable action pins.
- [x] Sanitized artifacts retained for 90 days.
- [x] No customer data, credentials or raw legal advice retained.
- [x] Contract tests cover drift, missing reviews and false acceptance.

## Reviewer onboarding

- [ ] Named reviewer assigned to each review ID.
- [ ] Identity verified.
- [ ] Qualifications verified.
- [ ] Independence confirmed.
- [ ] Conflict-of-interest declaration signed.
- [ ] Evidence channel approved.
- [ ] Target SHA and evidence digest acknowledged.
- [ ] SLA and expiry date agreed.

## Review completion

- [ ] Scope reviewed in full.
- [ ] Findings documented.
- [ ] Limitations documented.
- [ ] Changes requested resolved or explicitly accepted.
- [ ] Final disposition signed.
- [ ] Evidence package passes canonical schema.
- [ ] Integrity digest matches.
- [ ] Review is valid for the exact target SHA.
- [ ] Strict qualified-review validator passes.

## Final promotion

- [ ] All eight packages accepted.
- [ ] Completed coverage equals 100%.
- [ ] No blocker remains in the exact-SHA report.
- [ ] Final product decision is promoted only by the protected strict workflow.

Unchecked reviewer items are not software defects; they are required external assurance actions.
