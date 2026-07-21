# Post-Market Monitoring and AI Incident Governance

## Objective

Provide operational decision support and evidence preparation for post-market monitoring, signals, complaints, drift, corrective actions and potential serious-incident review under the EU AI Act.

## Regulatory mapping

- Article 72: post-market monitoring plan, signals, metrics, review cadence and corrective feedback.
- Article 73: serious-incident intake, investigation, corrective action and potential reporting assessment.
- Articles 9, 14 and 15: risk-management feedback, human oversight, accuracy, robustness and cybersecurity.

The exact applicability, deadlines and competent-authority duties depend on role, system classification, facts and applicable legal interpretation. The platform must not determine those duties automatically.

## Workflow

1. Approve a versioned monitoring plan.
2. Define metrics, thresholds, cadence and accountable owner.
3. Capture signals from drift, performance, cybersecurity, complaints, rights impact, provider changes and incidents.
4. Triage severity without presenting it as a definitive legal conclusion.
5. Contain high, critical, unknown or rights-impacting events before continued production use where required by the decision engine.
6. Investigate and record root cause.
7. Assign corrective and preventive actions.
8. Review effectiveness.
9. Complete human assessment of potential reporting obligations.
10. Obtain applicable legal review and independent approval before closure.

## Truth boundary

A completed form does not prove regulatory compliance, incident-reporting sufficiency, notification timeliness, system safety or corrective-action effectiveness. Evidence authenticity, legal applicability, production execution and regulator acceptance remain external dependencies.

## Permissions and evidence

All entities are tenant-scoped. RLS is enabled and forced. Cross-tenant references fail closed. Approval requires separation between owner, reviewer and approver. Evidence references may use SHA-256 digests; raw confidential evidence must remain in approved private storage.

## Required validation before promotion

- exact-head lint, typecheck, tests and build;
- isolated migration execution;
- live two-organization RLS positive and negative proof;
- protected runtime workflow proof;
- legal review of Article 72/73 methodology and deadlines;
- scorecard acceptance bound to the integrated main SHA.
