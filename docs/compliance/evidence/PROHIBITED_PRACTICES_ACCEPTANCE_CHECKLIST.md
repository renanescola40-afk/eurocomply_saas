# Prohibited Practices Governance Acceptance Checklist

Promote this workstream only when applicable items are evidenced against the exact integrated SHA.

## Applicability and context

- [ ] Article 5 applicability rationale is recorded.
- [ ] Intended purpose is recorded.
- [ ] Deployment contexts are recorded.
- [ ] Affected persons and groups are recorded.
- [ ] Relevant capabilities are recorded.
- [ ] Data sources are recorded.
- [ ] Outputs and foreseeable consequences are recorded.
- [ ] Last material system change is recorded.

## Eight signal reviews

For every Article 5 signal family:

- [ ] Explicit yes/no/unknown answer is recorded.
- [ ] Rationale is substantive and reviewable.
- [ ] Deployment context is documented.
- [ ] Consequence analysis is documented.
- [ ] Evidence is linked to the exact review and signal.
- [ ] Evidence digest validates.
- [ ] Owner is assigned.
- [ ] Independent reviewer is assigned.
- [ ] Review timestamp is newer than the last material change.
- [ ] Unknown answers remain blocked.

## Positive signals and legal review

- [ ] Every positive signal has an accountable legal conclusion.
- [ ] `prohibited` conclusions block production use.
- [ ] `not_prohibited` conclusions include contextual rationale and evidence.
- [ ] Legal reviewer belongs to the organization.
- [ ] Legal reviewer is distinct from the owner.
- [ ] Legal review timestamp is recorded.
- [ ] High and critical findings are closed.

## Exception claims

For each claimed exception:

- [ ] Exception type is recorded.
- [ ] Legal basis is recorded.
- [ ] Scope and purpose are recorded.
- [ ] Safeguards and conditions are recorded.
- [ ] Authorization reference is recorded.
- [ ] Necessity and proportionality assessment is recorded.
- [ ] Legal reviewer is assigned.
- [ ] Independent approver is assigned.
- [ ] Evidence digest validates.
- [ ] Valid-from date is recorded.
- [ ] Expiry or continuing-validity rule is recorded.
- [ ] Rejected, expired and withdrawn claims remain non-clearance outcomes.

## Accountability and approval

- [ ] Accountable owner is assigned.
- [ ] Independent reviewer is assigned.
- [ ] Legal reviewer is assigned when required.
- [ ] Approver is distinct from owner and reviewer.
- [ ] Review digest validates.
- [ ] Review is newer than the latest material change.
- [ ] Approval or non-applicability decision is timestamped.
- [ ] Non-applicability requires legal review and approval.
- [ ] Retirement preserves historical evidence.

## Tenant isolation and integrity

- [ ] Migration applies successfully to an isolated database.
- [ ] All five tables have RLS enabled and forced.
- [ ] Same-organization reads succeed.
- [ ] Cross-organization reads fail.
- [ ] Cross-organization review/signal relationships fail.
- [ ] Evidence cannot reference a signal or exception from another review.
- [ ] Actor membership checks reject foreign-tenant users.
- [ ] Direct authenticated mutations are denied.
- [ ] Evidence records are immutable.
- [ ] Decisions are append-only.
- [ ] SHA-256-shaped digests are enforced.

## Application integration

- [ ] Privileged APIs enforce authentication.
- [ ] APIs resolve organization context server-side.
- [ ] Mutations enforce permissions and separation of duties.
- [ ] Trusted-origin protection is applied.
- [ ] Distributed rate limits fail closed.
- [ ] JSON bodies are bounded and schema-validated.
- [ ] Sensitive responses use `Cache-Control: no-store`.
- [ ] Material decisions persist durable audit events.
- [ ] Audit persistence failures block successful mutation responses.
- [ ] Customer UI is accessible and localized.

## Downstream governance

- [ ] AI inventory references the current review version.
- [ ] Reassessment invalidates stale prohibited-practice reviews.
- [ ] Governance lifecycle consumes the governed decision.
- [ ] Risk register receives blocked findings.
- [ ] FRIA coordination is linked where relevant.
- [ ] Annex IV references the approved review and evidence versions.
- [ ] QMS includes prohibited-practice review controls.
- [ ] Conformity readiness remains blocked on unresolved signals.
- [ ] Post-market monitoring can reopen review after material evidence.

## Engineering and promotion

- [ ] Existing `assessProhibitedPractices` compatibility tests pass.
- [ ] Governed decision-engine tests pass.
- [ ] Migration contract tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Production build passes.
- [ ] CodeQL, Semgrep and secret scanning pass.
- [ ] Legal methodology review is accepted.
- [ ] Exact-SHA evidence manifest includes the workstream.
- [ ] Canonical scorecard promotion records limitations.

Passing this checklist demonstrates evidence-backed workflow readiness. It does not prove that a system is legally cleared, that an exception is valid, that an authority has authorized deployment or that Article 5 can never be triggered in production.
