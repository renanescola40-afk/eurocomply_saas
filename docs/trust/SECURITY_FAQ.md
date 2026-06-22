# Security FAQ

Status: procurement-safe FAQ. Answers must stay aligned with implementation and evidence.

## Do you have SOC 2?

Not currently. EuroComply must not claim SOC 2 Type I or Type II until an approved report exists.

## Are you ISO 27001 certified?

Not currently. The product may be designed to support security review, but certification must not be claimed without an active certificate.

## Has a third-party penetration test been completed?

Not currently claimed. Any future test should be referenced only with approved evidence and scope.

## How is authentication handled?

EuroComply uses Supabase Auth and server-side session checks. Private workspace routes require an authenticated session.

## How is authorization handled?

Organization access is role-based. Current roles include owner, admin, editor, member and viewer. Server-side authorization and database-level tenant boundaries must both be considered during review.

## Do you support audit logs?

The application includes audit event code paths and release evidence checks. Stronger statements about retention, immutability or external log storage require current evidence.

## What is your responsible disclosure contact?

Security reports should be sent privately to renansilva2002@gmail.com until a dedicated security mailbox is provisioned.

## What should sales say?

Use bounded language: EuroComply is designed to support enterprise security review with authenticated workspaces, role-based access, tenant-isolation controls, audit events, trust documentation and release evidence gates.