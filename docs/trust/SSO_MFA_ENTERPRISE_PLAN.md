# SSO/SAML and mandatory MFA enterprise plan

Status: planned. SSO/SAML and tenant-enforced mandatory MFA are not currently available as enterprise features.

## Objective

Define the enterprise identity controls required to answer customer security questionnaires positively.

## Target capabilities

### SSO/SAML

- Tenant-level SAML configuration.
- Metadata URL or XML upload.
- Entity ID and ACS URL documentation.
- Just-in-time user provisioning policy.
- Domain verification before SSO enforcement.
- Break-glass admin account policy.
- Audit events for SSO configuration changes.

### Mandatory MFA

- Tenant-level setting requiring MFA for all users.
- Grace period for rollout.
- Admin enforcement controls.
- Recovery codes or support workflow.
- Audit events for MFA enablement, disablement, and bypass.
- Reporting of non-compliant users.

## Security requirements

1. Only organization owners/admins may configure identity policies.
2. SSO configuration changes must create audit events.
3. MFA bypass must be auditable and time-bound.
4. Enterprise identity settings must be organization-scoped.
5. Users from one tenant must never influence another tenant's identity policy.

## Customer-safe answer before implementation

EuroComply does not currently provide SSO/SAML or tenant-enforced mandatory MFA. These controls are planned enterprise capabilities and should not be promised contractually until implemented and tested.
