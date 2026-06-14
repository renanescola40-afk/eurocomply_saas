# Release Execution Evidence Manifest

This manifest defines the concrete execution evidence required before a EuroComply release is promoted beyond private beta.

It complements the release readiness documents by separating documented readiness from executed readiness.

## Purpose

A release can be documented without being proven. This manifest lists the files, reports, screenshots, links, and owner confirmations that must exist before production or enterprise approval.

## Evidence levels

- Level 0: missing evidence.
- Level 1: documented plan only.
- Level 2: command executed locally or in CI without preserved artifact.
- Level 3: artifact preserved, reviewed, and linked to the release approval record.

## Required execution evidence

### Build evidence

Required artifacts:

- Build command output.
- Build environment identifier.
- Commit SHA used for the build.
- Deployment target.
- Build owner.

Minimum production level: 3.

### Test evidence

Required artifacts:

- Unit test output.
- Typecheck output.
- Route/quality checks output.
- E2E decision: executed or formally deferred.
- Known failing tests and owner.

Minimum production level: 3 for unit/typecheck. E2E may be Level 2 with approved exception for private beta only.

### Security command evidence

Required artifacts:

- Security CI command output.
- Release readiness command output.
- Final readiness command output.
- Any failing gate and owner.
- Any bypass or exception approval.

Minimum production level: 3.

### Supply-chain evidence

Required artifacts:

- Lockfile status.
- Dependency install mode.
- Dependency audit output.
- High and critical findings triage.
- Floating dependency review.

Minimum production level: 3.

### Database and tenant isolation evidence

Required artifacts:

- Target database project identifier.
- Migration status.
- RLS live validation evidence.
- Tenant isolation test evidence.
- Critical tables reviewed.

Minimum production level: 3.

### Audit-chain evidence

Required artifacts:

- Audit-chain migration status.
- Transactional append path validation.
- Concurrency test evidence.
- Chain verification evidence.
- Fallback mode decision.

Minimum production level: 3 for enterprise, 2 with exception for private beta.

### Step-up authentication evidence

Required artifacts:

- Protected actions list.
- Step-up configuration status.
- Token validation evidence.
- MFA or identity-provider status.
- Any fallback decision.

Minimum production level: 2 for private beta, 3 for enterprise.

### Upload scanning evidence

Required artifacts:

- File signature validation result.
- Upload content scan configuration.
- Rejection evidence for unsafe upload.
- Scanner provider status.
- Fail-open or fail-closed decision.

Minimum production level: 2 for private beta, 3 for enterprise.

### Billing evidence

Required artifacts:

- Checkout validation.
- Billing portal validation.
- Webhook validation.
- Stripe mode and account confirmation.
- Failed payment handling decision.

Minimum production level: 3.

### Observability evidence

Required artifacts:

- Error monitoring target.
- Alert routing owner.
- Incident escalation path.
- Audit event visibility.
- Rollback signal thresholds.

Minimum production level: 3.

### Customer and support evidence

Required artifacts:

- Customer communication owner.
- Support readiness owner.
- Status page decision.
- Support escalation matrix.
- Customer notice draft.

Minimum production level: 3 for production and enterprise.

## Approval integration

The release owner must attach this manifest to:

- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_EVIDENCE_CHECKLIST.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
- `docs/RELEASE_OPERATIONS_INDEX.md`

## Automatic No-Go conditions

A release is No-Go when any of these are true:

- Build evidence is missing.
- Security command evidence is missing.
- Database or tenant isolation evidence is missing.
- Rollback owner is missing.
- Customer/support owner is missing for public production.
- High or critical dependency findings are untriaged.
- Audit-chain fallback is enabled for enterprise without explicit approval.
- Billing webhook validation is missing for paid production.

## Conditional Go conditions

A release may be Conditional Go only when:

- Missing evidence has a named owner.
- The exception has an expiration date.
- The release owner accepts the risk.
- Customer-facing impact is documented.

## Final rule

Production release requires evidence, not only plans. Enterprise release requires preserved evidence linked to the approval record.
