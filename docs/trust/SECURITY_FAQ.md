# Security FAQ

Status: procurement-safe FAQ. Answers must stay aligned with implementation and evidence.

## What is your SOC 2 status?

Not currently available. Risck comply must not claim SOC 2 Type I or Type II until an approved report exists.

## What is your ISO 27001 status?

Not currently certified. The product may be designed to support security review, but certification must not be claimed without an active certificate.

## What is your third-party security review status?

Not currently claimed as complete. Any future review should be referenced only with approved evidence and scope.

## How is authentication handled?

Risck comply uses Supabase Auth and server-side session checks. Private workspace routes require an authenticated session.

## How is authorization handled?

Organization access is role-based. Current roles include owner, admin, editor, member and viewer. Server-side authorization and database-level tenant boundaries must both be considered during review.

## Do you support audit logs?

The application includes audit event code paths and release evidence checks. Stronger statements about retention, immutability or external log storage require current evidence.

## How do you handle encryption in transit?

Risck comply is designed to use HTTPS/TLS through managed hosting and provider APIs. Deployment and provider evidence should be attached before stronger contractual commitments are made.

## How do you handle data retention?

Retention commitments are agreement-dependent until a formal policy is approved. Customer-specific periods must be confirmed in the signed agreement.

## What is your responsible disclosure contact?

Security reports should be sent privately to renansilva2002@gmail.com until a dedicated security mailbox is provisioned.

## What should sales say?

Use bounded language: Risck comply is designed to support enterprise security review with authenticated workspaces, role-based access, tenant-isolation controls, audit events, trust documentation and release evidence gates.
