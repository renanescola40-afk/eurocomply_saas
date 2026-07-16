# ADR-0087: Enforce mutation origin guards by default

- Status: Proposed
- Date: 2026-07-16
- Decision owners: Security Engineering and Platform Engineering

## Context

The origin-guard scanner reported the public prelaunch waitlist mutation as an advisory finding. That route persists lead data and can trigger customer and internal email delivery, but it did not validate the browser Origin or Referer before rate limiting, body parsing, persistence, webhook delivery, and email side effects. The scanner also remained advisory unless a caller remembered to set an environment variable.

## Decision

Apply the shared `assertTrustedOrigin` guard at the beginning of the prelaunch POST handler. Make the repository origin-guard scanner blocking by default, with advisory behavior available only through the explicit `ENFORCE_ORIGIN_GUARDS=false` opt-out. Keep webhook, internal, operational, public-verifier, and intentionally exempt lead-capture routes under their existing classifications.

## Security properties

- Untrusted, invalid, or missing production origins fail closed with a sanitized no-store response.
- Origin validation runs before rate-limit consumption, request parsing, database access, webhook delivery, or email delivery.
- Future unguarded mutation routes fail repository security CI by default.
- Development requests without Origin retain the existing development-only behavior of the shared guard.

## Risks and trade-offs

- Misconfigured `NEXT_PUBLIC_APP_URL` and `TRUSTED_ORIGINS` can reject legitimate production submissions.
- Non-browser clients must provide an allowed Origin or Referer in production.
- `POST /api/leads` remains intentionally exempt and should be reviewed separately before its cross-origin contract changes.
- Origin validation is a defense against browser cross-site requests; it does not replace rate limiting, schema validation, authentication, or abuse monitoring.

## Validation

Run `npm run security:origin-guards`, the prelaunch waitlist regression test, typecheck, and the repository CI/security gates on the exact pull-request SHA.

## Rollback

Revert this ADR and the associated route, checker, and test changes. If legitimate traffic is blocked during diagnosis, use the explicit advisory opt-out only in a non-production validation context; do not weaken the production route guard.
