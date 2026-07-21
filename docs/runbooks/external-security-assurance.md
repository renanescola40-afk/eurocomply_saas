# External Security Assurance Runbook

## Goal

Commission, receive, remediate and accept an independent security review without overstating assurance.

## Preparation

1. Freeze the candidate `main` SHA.
2. Confirm the production-like environment and test accounts are isolated from real customer data.
3. Provide the assessor with the versioned scope manifest, architecture overview, test-user roles and disclosure channel.
4. Never send production secrets, service-role keys or customer data in tickets or reports.

## Execution

The assessor must test authentication, authorization, tenant isolation, RLS, APIs, server actions, Stripe webhooks, uploads, operational endpoints and CI/cloud configuration. Testing that could affect availability requires a scheduled window and written approval.

## Finding lifecycle

- Critical: release blocked; immediate incident assessment.
- High: release blocked until independently retested.
- Medium: remediation plan and accountable owner required.
- Low/informational: tracked through normal security backlog.

Do not downgrade findings merely to unblock release. Risk acceptance must be explicit, time-bounded and cannot accept unresolved critical or high findings for enterprise Go.

## Evidence acceptance

1. Store only the redacted canonical evidence JSON in the expected runtime-evidence path.
2. Run **External Security Assurance Acceptance** with the exact reviewed SHA.
3. Confirm the protected environment reviewer is not the original evidence author.
4. Inspect the retained decision artifact.
5. Promote the external-assurance control only after the validator reports `ACCEPTED_FOR_ENTERPRISE_PROMOTION`.

## Rerun rules

Any material auth, tenant-isolation, payment, upload or infrastructure change after the review requires impact assessment and potentially a scoped retest. A changed release SHA is never silently treated as reviewed.

## Rollback

Removing the workflow or validator does not authorize release. The enterprise decision remains `NO_GO` until equivalent independently reviewed evidence is accepted.
