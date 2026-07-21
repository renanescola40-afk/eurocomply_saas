# Enterprise Runtime Campaign Contract

## Purpose

Provide one protected, exact-main campaign that executes the principal runtime evidence lanes required for enterprise release closeout.

## Decision states

- `READY_FOR_EVIDENCE_PROMOTION`: every required workflow completed successfully and produced at least one downloadable, non-expired artifact.
- `NO_GO`: one or more workflows failed, timed out, could not be dispatched, or produced no artifact.

This campaign does not itself declare the SaaS enterprise-ready. The collected source artifacts must still pass their lane-specific validators and the canonical enterprise release decision builder.

## Provenance requirements

- lowercase full 40-character SHA;
- branch fixed to `main`;
- SHA equal to the current remote `main` commit at campaign start;
- each child run must be a `workflow_dispatch` run on `main` with the exact release SHA;
- artifacts must be attached to the matching child run.

## Safety boundary

- execution requires the protected `production-enterprise-closeout` environment;
- an operator must type `RUN_ENTERPRISE_RUNTIME_CLOSEOUT`;
- repository credentials are not persisted by checkout;
- the campaign stores run IDs, conclusions and artifact metadata only;
- secret values, provider payloads, customer data and raw credentials must remain outside the campaign summary;
- child workflows retain their own protected environments, approvals and fail-closed validators.

## Evidence limitations

A successful campaign proves orchestration and artifact availability. It does not prove legal sufficiency, external assurance, customer acceptance, production correctness beyond the child workflow assertions, or that an artifact is eligible for scorecard promotion until the canonical validator accepts it.
