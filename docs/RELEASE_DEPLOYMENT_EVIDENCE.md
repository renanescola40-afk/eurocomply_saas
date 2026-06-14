# Release Deployment Evidence Standard

This standard defines the evidence required to prove that a EuroComply release was deployed intentionally, to the correct environment, from the approved commit, with a known rollback path.

## Purpose

Release approval is incomplete without deployment evidence. This document turns deployment from an implicit platform action into a reviewable release artifact.

## Required deployment identity

Every deployment record must include:

- Release name.
- Approved commit SHA.
- Deployed commit SHA.
- Deployment platform.
- Deployment environment.
- Deployment URL or environment identifier.
- Deployment timestamp.
- Deployment owner.
- Release approver.
- Rollback owner.

## Required pre-deployment checks

Before deployment, the release owner must confirm:

- Release readiness has passed or has approved exceptions.
- Go/No-Go decision is Go or approved Conditional Go.
- Approval record is complete.
- Execution evidence manifest has been reviewed.
- Rollback plan has an owner.
- Incident response owner is assigned.
- Customer/support owners are assigned when customer-facing.

## Required post-deployment checks

After deployment, the release owner must confirm:

- Application health check completed.
- Authentication check completed.
- Billing check completed when billing is enabled.
- Upload check completed when upload is enabled.
- Audit event check completed when audit-chain is enabled.
- RLS smoke check completed when Supabase is enabled.
- Error monitoring checked.
- Rollback path remains available.

## Evidence attachments

The deployment evidence package should include:

- Build log link or captured output.
- Deployment log link or captured output.
- Platform deployment identifier.
- Post-deploy validation notes.
- Any warnings or partial failures.
- Decision to proceed, pause, or roll back.

## Automatic No-Go conditions

Deployment must not proceed when:

- Approved commit SHA and deployed commit SHA do not match.
- Deployment target is unclear.
- Rollback owner is missing.
- Release approver is missing.
- Required customer communication owner is missing.
- Release readiness is failing without approved exception.
- Security or tenant isolation evidence is missing for enterprise.

## Rollback trigger conditions

Rollback must be considered when:

- Authentication is unavailable.
- Tenant isolation is suspected to be broken.
- Billing is charging incorrectly.
- Uploads accept unsafe files.
- Audit-chain writes are inconsistent.
- Customer-facing error rate crosses the rollback threshold.
- Security owner classifies the deployment as unsafe.

## Release approval integration

Deployment evidence must be referenced by:

- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
- `docs/RELEASE_EXECUTION_EVIDENCE_MANIFEST.md`
- `docs/RELEASE_ROLLBACK_PLAN.md`
- `docs/RELEASE_OPERATIONS_INDEX.md`

## Final rule

A release is not production-complete until deployment evidence confirms the approved commit is the deployed commit and post-deployment checks are reviewed.
