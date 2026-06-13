# Release Approval Record

This document is the release owner record used to approve or reject a EuroComply release candidate.

## Release identity

- Release name:
- Commit SHA:
- Date:
- Release owner:
- Approver:
- Target environment:

## Required checks

The release owner must confirm each item before approval.

### Governance gates

- Release readiness command completed.
- Release evidence checklist completed.
- Release candidate validation runbook reviewed.
- Any exceptions have an owner and expiration date.

### Build and CI

- Application build completed successfully.
- Security gates completed successfully.
- Failed checks are either fixed or documented as approved exceptions.

### Supply-chain

- Lockfile status reviewed.
- Dependency audit status reviewed.
- High-risk findings are fixed or have documented acceptance.

### Database and tenant isolation

- Supabase migrations reviewed.
- Row-level security validation reviewed.
- Tenant isolation evidence attached.

### Audit integrity

- Audit-chain migration status reviewed.
- Transactional audit-chain behavior reviewed.
- Audit-chain evidence attached.

### Authentication and authorization

- RBAC behavior reviewed.
- Step-up authentication status reviewed.
- Any temporary fallback is documented.

### Upload security

- File signature validation reviewed.
- Upload content scanning status reviewed.
- Enterprise fail-closed setting reviewed where applicable.

### Billing

- Checkout behavior reviewed.
- Billing portal behavior reviewed.
- Webhook handling reviewed.

### Observability

- Error monitoring reviewed.
- Audit logging reviewed.
- Incident response owner confirmed.

### External review

- Security review or pentest status reviewed.
- Critical findings are fixed or explicitly accepted.

## Approval decision

Choose one:

- Approved for private beta.
- Approved for public production.
- Approved for enterprise pilot.
- Rejected.

## Exceptions

| Area | Exception | Owner | Expiration | Mitigation |
| --- | --- | --- | --- | --- |
| | | | | |

## Final sign-off

- Release owner:
- Approver:
- Date:
- Notes:
