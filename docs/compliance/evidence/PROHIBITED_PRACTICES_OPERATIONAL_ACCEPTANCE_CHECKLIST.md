# Prohibited Practices Operational Acceptance Checklist

## Product workflow

- [x] Customer-facing workspace exists.
- [x] Control Tower links to the workspace.
- [x] Reviews are versioned.
- [x] All eight Article 5 signals are created automatically.
- [x] Signal answers, legal conclusions and evidence can be recorded.
- [x] Positive signals require a legal reviewer.
- [x] Approval is fail-closed.

## Security

- [x] Authentication and active organization are required.
- [x] Reads require `read_ai_governance`.
- [x] Writes require `manage_ai_governance`.
- [x] Trusted Origin protects mutations.
- [x] Zod and body-size limits protect inputs.
- [x] Distributed rate limiting fails closed.
- [x] Evidence references are organization-scoped.
- [x] Errors are sanitized and responses are no-store.

## Transaction integrity

- [x] Review version creation uses an advisory lock.
- [x] Eight signal rows are created in the same transaction.
- [x] Evidence count and signal state are synchronized by triggers.
- [x] Parent counters are derived from signal rows.
- [x] Approval requires eight evidence-complete approved signals.
- [x] Approval and decision append occur atomically.
- [x] RPC execution is restricted to `service_role`.

## Release evidence

- [ ] Exact-head lint passes.
- [ ] Exact-head typecheck passes.
- [ ] Unit and migration contract tests pass.
- [ ] Production build passes.
- [ ] Route-quality and application-security gates pass.
- [ ] Isolated migration validation passes.
- [ ] Positive and negative two-organization proof passes.
- [ ] Forced audit-outage behaviour is verified.
- [ ] Accessibility and responsive review passes.
- [ ] Translation review passes.
- [ ] Qualified legal methodology review is accepted.
- [ ] Canonical scorecard promotion is accepted.

Passing this checklist supports operational evidence readiness only. It does not prove that a system is lawful, non-prohibited, regulator-approved or safe to deploy.
