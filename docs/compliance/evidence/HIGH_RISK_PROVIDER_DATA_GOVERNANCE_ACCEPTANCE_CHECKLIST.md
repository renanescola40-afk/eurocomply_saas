# High-Risk Provider Data-Governance Acceptance Checklist

Promote this workstream only when applicable items are evidenced against the exact integrated SHA.

## Applicability and accountability

- [ ] Applicability rationale is recorded.
- [ ] Provider role is recorded and reviewed.
- [ ] High-risk classification is linked to the canonical decision engine.
- [ ] Accountable owner is assigned.
- [ ] Independent reviewer is assigned.
- [ ] Approver is distinct from owner and reviewer.
- [ ] Required legal review is complete.

## Dataset inventory and provenance

- [ ] Every in-scope dataset is inventoried.
- [ ] Dataset lifecycle role is recorded.
- [ ] Intended purpose is recorded.
- [ ] Source category and source version are recorded.
- [ ] Collection provenance is complete.
- [ ] Acquisition-rights review is recorded.
- [ ] Preparation and cleaning are documented.
- [ ] Annotation and labeling instructions are documented.
- [ ] Provenance and schema digests validate.

## Quality and statistical evidence

- [ ] Quality criteria are defined.
- [ ] Relevance is assessed.
- [ ] Representativeness is assessed.
- [ ] Completeness is assessed.
- [ ] Accuracy is assessed.
- [ ] Statistical properties are assessed.
- [ ] Data gaps are documented.
- [ ] Training, validation and testing separation is verified.
- [ ] Data leakage assessment is complete.
- [ ] Assessment methodology and findings are reviewable.
- [ ] Residual risk is explicit and not unknown.

## Bias and fundamental-rights coordination

- [ ] Protected-group analysis is complete where relevant.
- [ ] Bias risks are assessed.
- [ ] Bias mitigations have owners and deadlines.
- [ ] Mitigation effectiveness is independently verified.
- [ ] High and critical findings are closed.
- [ ] Special-category data use is explicitly identified.
- [ ] Required data-protection and legal review is complete.
- [ ] FRIA coordination is documented where applicable.

## Lifecycle and monitoring

- [ ] Dataset versions are locked and traceable.
- [ ] Material changes trigger reassessment.
- [ ] Review timestamps are newer than material changes.
- [ ] Data lineage integrity is verified.
- [ ] Drift monitoring is configured.
- [ ] Post-deployment feedback is linked.
- [ ] Dataset retirement and supersession are supported.
- [ ] Annex IV references the correct dataset versions.
- [ ] QMS and conformity workflows reference the approved program.

## Security and evidence integrity

- [ ] Migration applies successfully to an isolated database.
- [ ] All six tables have RLS enabled and forced.
- [ ] Positive same-organization reads pass.
- [ ] Negative cross-organization reads and relationships fail.
- [ ] Actor membership checks reject foreign-tenant users.
- [ ] Direct authenticated mutations are denied.
- [ ] Privileged APIs enforce authorization, trusted origin, rate limits and bounded validation.
- [ ] Evidence digests use SHA-256 format.
- [ ] Evidence records are immutable.
- [ ] Material decisions are append-only.
- [ ] Audit persistence fails closed.

## Engineering and promotion

- [ ] Exact-head unit and contract tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Production build passes.
- [ ] Customer-facing UI is accessible and localized.
- [ ] Statistical methodology review is accepted.
- [ ] Legal methodology review is accepted.
- [ ] Exact-SHA evidence manifest includes the workstream.
- [ ] Canonical scorecard promotion records limitations.

Passing this checklist demonstrates evidence-backed workflow readiness. It does not prove that datasets are unbiased, lawful, technically sufficient, regulator-approved or compliant in every deployment context.
