# Security FAQ

Status: customer-safe FAQ for procurement and security questionnaires. Answers must stay aligned with implementation evidence and must not overstate certifications or external assurance.

## Do you have SOC 2?

No. EuroComply does not currently have a SOC 2 Type I or Type II report. SOC 2 readiness can be discussed as a roadmap item, but it must not be represented as completed or audited.

## Are you ISO 27001 certified?

No. EuroComply is not currently ISO 27001 certified. ISO 27001 readiness documentation may support future preparation, but it is not a certification.

## Have you completed a third-party penetration test?

No completed third-party penetration test is currently documented. The procurement-safe answer is that penetration testing is planned/readiness-tracked and will require a completed report and remediation evidence before the claim can be upgraded.

## How is authentication handled?

Authentication is handled through Supabase Auth. Middleware checks the Supabase session for private localized routes and redirects unauthenticated users to login. Server-side helpers call `auth.getUser()` before user-specific operations.

## Do you support SSO or SAML?

Not currently. Enterprise SSO/SAML is documented as planned and must not be promised as available until implemented and tested.

## Do you enforce MFA?

Tenant-enforced MFA is not currently documented as available. Some step-up authentication coverage exists for sensitive operations, but organization-wide MFA enforcement should be described as a roadmap item unless implemented.

## How does RBAC work?

RBAC is organization-scoped. Current roles are owner, admin, editor, member, and viewer. Each role maps to explicit permissions in `src/server/security/rbac.ts`. Unknown role labels normalize to viewer.

## How is tenant isolation implemented?

Tenant isolation is designed around organization membership checks, organization-scoped queries, and Supabase RLS migrations. Live RLS validation must be completed against the target Supabase project before claiming production tenant isolation is verified.

## Are audit logs immutable?

No customer-safe answer should call audit logs immutable today. The application includes audit events, SHA-256 hash-chain support, and optional HMAC signatures, but WORM/externally immutable storage is not currently evidenced.

## What data is encrypted?

EuroComply is designed to use TLS in transit, provider-managed encryption at rest, Stripe-hosted payment processing, and application-layer audit integrity controls. It does not currently offer end-to-end encryption or customer-managed keys.

## Do you have backups?

A backup restore test plan exists, and provider-managed backup capabilities must be verified for the target environment. A formal backup restore exercise has not yet been completed, so do not claim tested backups or guaranteed RTO/RPO.

## Do you have monitoring?

The repository references operational logging, error reporting, readiness checks, and release evidence, but 24/7 staffed monitoring is not currently offered contractually. Monitoring claims must match the deployed provider configuration and release evidence.

## Who are your subprocessors?

The current subprocessors register is in `docs/trust/SUBPROCESSORS.md`. It is a draft operational register and must be verified for provider usage, regions, DPAs, and customer notice terms before contract signature.

## How do we report a vulnerability?

Send private reports to `renansilva2002@gmail.com` until a dedicated security mailbox is provisioned. Include the affected URL/component, reproduction steps, expected impact, and whether customer data, authentication, billing, storage, or organization isolation may be affected.
