# Final Release Evidence Index

This is the consolidated evidence index for a EuroComply release candidate.

Use this file as the final navigation document before approving a release.

## Core release decision

Required records:

- `docs/RELEASE_CANDIDATE_VALIDATION.md`
- `docs/RELEASE_EVIDENCE_CHECKLIST.md`
- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_APPROVAL_LINKAGE.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`

## Operational readiness

Required records:

- `docs/RELEASE_ROLLBACK_PLAN.md`
- `docs/RELEASE_INCIDENT_RESPONSE_PLAN.md`
- `docs/RELEASE_POST_INCIDENT_REVIEW.md`
- `docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md`
- `docs/RELEASE_SUPPORT_READINESS.md`
- `docs/RELEASE_OPERATIONS_INDEX.md`

## Execution evidence

Required records:

- `docs/RELEASE_EXECUTION_EVIDENCE_MANIFEST.md`
- `docs/RELEASE_DEPLOYMENT_EVIDENCE.md`
- `docs/RELEASE_POST_DEPLOY_SMOKE_VALIDATION.md`
- `docs/RELEASE_POST_DEPLOY_EVIDENCE_INDEX.md`
- `docs/RELEASE_READINESS_SCORECARD.md`
- `docs/RELEASE_READINESS_SCORECARD_RUNBOOK.md`
- `docs/RELEASE_FULL_READINESS_RUNNER.md`

## Security readiness

Required records:

- `docs/security/LOCKFILE_TRIAGE_RUNBOOK.md`
- `docs/security/RLS_LIVE_VALIDATION_RUNBOOK.md`
- `docs/security/AUDIT_CHAIN.md`
- `docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md`
- `docs/security/UPLOAD_CONTENT_SCAN.md`
- `docs/security/STEP_UP_ROLLOUT_MATRIX.md`

## Required command evidence

The release owner should attach output for:

- `npm run release:readiness`
- `node scripts/security/check-release-execution-readiness.mjs`
- `node scripts/security/check-release-full-readiness.mjs`
- `npm run security:ci`
- `npm run build`
- `npm run typecheck`
- `npm run test`

## Required external evidence

The release owner should attach:

- deployment platform build evidence
- deployment platform deploy evidence
- database migration evidence
- RLS live validation evidence
- billing provider evidence when billing is enabled
- monitoring/observability evidence
- customer/support readiness evidence
- accepted exceptions

## Final release rule

A release can be treated as production-ready only when:

- the approved commit matches the deployed commit
- command evidence is attached
- deployment evidence is attached
- post-deploy evidence is attached
- no automatic No-Go item remains open
- every exception has owner and expiration
- final approval is signed
