# FRIA Operational Acceptance Checklist

## Product workflow

- [x] Customer-facing FRIA workspace exists.
- [x] Regulatory Control Tower links to the workspace.
- [x] Assessment creation is linked to a tenant-owned AI system.
- [x] Assessment updates execute the deterministic FRIA engine.
- [x] Evidence can be attached to a specific FRIA control.
- [x] Approval executes the engine again against persisted state.
- [x] Approval requires the authenticated recorded approver.
- [x] Incomplete approval returns a conflict and missing controls.

## API security

- [x] Authentication is required.
- [x] Active organization is required.
- [x] Reads require `read_ai_governance`.
- [x] Writes require `manage_ai_governance`.
- [x] Mutations require trusted Origin.
- [x] Request JSON is bounded and validated by Zod.
- [x] Distributed rate limiting fails closed.
- [x] Every resource read and write is scoped by `organization_id`.
- [x] AI-system ownership is validated before creation.
- [x] Storage references cannot escape the organization namespace.
- [x] Responses are no-store and errors are sanitized.
- [x] The API route is registered as high-risk.

## Audit integrity

- [x] Assessment creation emits a durable audit event.
- [x] Assessment updates emit a durable audit event.
- [x] Assessment approval emits a durable audit event.
- [x] Evidence submission emits a durable audit event.
- [x] Create operations roll back if audit persistence fails.
- [x] Updates and approval restore the previous record if audit persistence fails.
- [ ] Forced audit outage is proven against an isolated runtime.
- [ ] Compensation failure alerting is verified.

## Data and tenant validation

- [ ] FRIA migration applies in an isolated database.
- [ ] Same-organization create, read, update and evidence submission pass.
- [ ] Foreign AI-system creation is rejected.
- [ ] Foreign assessment update and approval are rejected.
- [ ] Foreign storage references are rejected.
- [ ] Reviewer and approver membership triggers are validated.
- [ ] Owner, reviewer and approver separation is validated live.

## Engineering and release

- [ ] Exact-head lint passes.
- [ ] Typecheck passes.
- [ ] Unit and contract tests pass.
- [ ] Production build passes.
- [ ] Route-quality and application-security gates pass.
- [ ] CodeQL, Semgrep, dependency review and secret scanning pass.
- [ ] Accessibility and responsive visual review pass.
- [ ] Translation review passes.
- [ ] Qualified legal and fundamental-rights methodology review is accepted.
- [ ] Exact-SHA product coverage promotion is retained.

Passing this checklist demonstrates an operational evidence workflow. It does not establish legal applicability, evidence truth, fundamental-rights compliance, regulator acceptance or deployment authorization.
