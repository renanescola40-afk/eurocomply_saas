# ADR: Bounded Qualified Reviewer Portal

## Status

Accepted for implementation; production evidence remains required.

## Decision

External qualified-review work uses opaque one-time invitation tokens and short-lived opaque sessions. Only SHA-256 digests are stored. Access is limited to one organization, assignment and reviewer. Reviewers must attest independence and acknowledge scope before submitting an exact-SHA opinion. Administrative users may revoke the invitation and all active sessions. Expiry cleanup is backend-only.

## Security properties

- no anonymous table access;
- forced RLS for administrative reads;
- service-role-only acceptance and expiry functions;
- composite tenant foreign keys;
- invitation lifetime capped at 14 days;
- session lifetime capped at 12 hours and issued for eight hours;
- exact campaign SHA required;
- terminal assignments immutable through the reviewer portal;
- old submissions superseded rather than overwritten;
- distributed fail-closed rate limiting and no-store API responses.

## Alternatives rejected

- Giving reviewers organization membership: excessive access and role-management burden.
- Long-lived API keys: wider replay and revocation risk.
- Email address as authorization: identity hint, not proof of possession.
- Client-side direct Supabase writes: bypasses the server policy boundary.

## Truth boundary

The portal enables genuine human review but does not manufacture reviewer qualifications, opinions, approvals, certification or regulator acceptance.
