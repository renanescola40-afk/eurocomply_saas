# Annex IV Technical Documentation Acceptance Checklist

A control may be promoted only when the evidence is retained against the exact integrated commit SHA and the applicable limitations are recorded.

## Applicability and identity

- [ ] Annex IV applicability rationale is recorded.
- [ ] Provider or other relevant operator role is reviewed.
- [ ] AI-system identifier and version are controlled.
- [ ] Documentation package version is controlled.
- [ ] Reviewed non-applicability decision exists when the package is not required.

## Section completeness

For every governed section:

- [ ] Summary is substantive and current.
- [ ] Evidence references are present.
- [ ] Evidence digests validate as SHA-256.
- [ ] Source version is recorded.
- [ ] Accountable owner is assigned.
- [ ] Independent reviewer is assigned.
- [ ] Reviewer is different from the owner.
- [ ] Review and approval timestamps are valid.
- [ ] Review occurred after the latest material change.
- [ ] Section status is approved.

Required sections:

- [ ] General description.
- [ ] System elements and development.
- [ ] Monitoring, functioning and control.
- [ ] Risk management.
- [ ] Data governance and lineage.
- [ ] Validation, testing and performance metrics.
- [ ] Human oversight.
- [ ] Cybersecurity.
- [ ] Lifecycle changes.
- [ ] Standards and specifications.
- [ ] EU declaration and conformity linkage.
- [ ] Post-market monitoring.

## Cross-workflow evidence

- [ ] System-to-evidence traceability is complete.
- [ ] Data provenance and lineage are complete.
- [ ] Validation and testing evidence are complete.
- [ ] Instructions for use are aligned.
- [ ] Risk-management record is linked.
- [ ] Post-market monitoring plan is linked.
- [ ] Conformity-assessment workflow is linked.
- [ ] Lifecycle change log is complete.
- [ ] Substantial-modification review is complete.

## Findings and approvals

- [ ] No open critical findings remain.
- [ ] No open high findings remain.
- [ ] Accountable package owner is assigned.
- [ ] Independent package reviewer is assigned.
- [ ] Package approver is assigned.
- [ ] Required legal review is complete.
- [ ] Package digest validates.
- [ ] Package approval timestamp is recorded.

## Tenant and security evidence

- [ ] Migration succeeds in an isolated database.
- [ ] All five tables have enabled and forced RLS.
- [ ] Organization A can read its own package records.
- [ ] Organization A cannot read Organization B records.
- [ ] Cross-organization child references fail.
- [ ] Cross-organization actor references fail.
- [ ] Authenticated direct writes fail.
- [ ] Privileged API authorization succeeds only with the required permission.
- [ ] Evidence, changes and decisions reject update and delete operations.

## Engineering and runtime evidence

- [ ] Exact-head lint passes.
- [ ] Exact-head typecheck passes.
- [ ] Unit and migration-contract tests pass.
- [ ] Exact-head production build passes.
- [ ] Customer-facing workflow has accessibility review.
- [ ] Engineering methodology review is accepted.
- [ ] Legal applicability methodology review is accepted.
- [ ] Canonical scorecard promotion retains the exact-SHA evidence manifest.

Passing this checklist demonstrates evidence-backed workflow readiness. It does not certify technical truth, guarantee conformity, authorize market placement or predict regulator or notified-body acceptance.
