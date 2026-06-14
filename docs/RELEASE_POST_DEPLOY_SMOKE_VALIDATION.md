# Release Post-Deploy Smoke Validation Standard

This standard defines the smoke checks that must be completed immediately after a EuroComply deployment.

## Purpose

Deployment evidence proves that a release was deployed. Smoke validation proves that the deployed release is usable, safe, and still aligned with the approved release package.

## Required smoke validation identity

Each smoke validation record must include:

- Release name.
- Approved commit SHA.
- Deployed commit SHA.
- Deployment environment.
- Deployment URL or environment identifier.
- Validation timestamp.
- Validation owner.
- Rollback owner.
- Incident response owner.

## Required smoke checks

### Application availability

The validator must confirm:

- Application loads successfully.
- Authenticated area is reachable.
- Public landing or entry route is reachable.
- No obvious server-side error page appears.

### Authentication and authorization

The validator must confirm:

- Sign-in path is reachable.
- Protected routes reject unauthenticated access.
- Organization-scoped areas require membership.
- Sensitive actions still require step-up when configured.

### Database and tenant isolation

The validator must confirm:

- Supabase connection is healthy.
- Organization-scoped read path works for the active tenant.
- Cross-tenant access is not observed during smoke validation.
- RLS live validation evidence remains linked for production or enterprise.

### Audit-chain

The validator must confirm:

- Audit event write path is available.
- Chain verification endpoint or runbook remains available.
- Transactional audit append status is documented.
- Fallback mode is not silently enabled for enterprise.

### Upload path

The validator must confirm:

- Accepted file type still uploads successfully.
- Rejected file type remains rejected.
- Upload content scan mode is documented.
- Upload rejection evidence is preserved when applicable.

### Billing path

The validator must confirm:

- Checkout route is reachable when billing is enabled.
- Billing portal route is reachable when billing is enabled.
- Webhook validation evidence is linked before paid production.
- Stripe mode is documented.

### Observability

The validator must confirm:

- Error monitoring is reachable.
- Critical logs are visible.
- Alert owner is assigned.
- Rollback signal thresholds are known.

### Customer/support readiness

The validator must confirm:

- Customer communication owner is assigned.
- Support owner is assigned.
- Status page decision is recorded.
- Customer notice decision is recorded.

## Automatic rollback review conditions

Rollback must be reviewed immediately when:

- Authentication fails.
- Tenant isolation is suspected to fail.
- Billing charges incorrectly.
- Unsafe uploads are accepted.
- Audit writes fail or become inconsistent.
- Critical customer-facing routes are unavailable.
- Error rate exceeds the rollback threshold.

## Evidence attachments

The smoke validation package should include:

- Timestamped validation notes.
- Environment identifier.
- Commit SHA comparison.
- Screenshots or command output when available.
- Failing checks and owners.
- Final decision: continue, pause, or rollback.

## Approval integration

Smoke validation must be referenced by:

- `docs/RELEASE_DEPLOYMENT_EVIDENCE.md`
- `docs/RELEASE_EXECUTION_EVIDENCE_MANIFEST.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
- `docs/RELEASE_ROLLBACK_PLAN.md`
- `docs/RELEASE_OPERATIONS_INDEX.md`

## Final rule

A deployment is not production-complete until smoke validation confirms the application is reachable, protected actions remain protected, and rollback conditions have been reviewed.
