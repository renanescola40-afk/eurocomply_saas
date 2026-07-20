# Platform providers evidence contract

Canonical path: `docs/security/evidence/runtime/platform-providers-validation.json`

The document may be `Complete/passed` only when it is bound to a full 40-character `main` SHA and all checks below are true:

- protected main execution;
- checkout validation;
- subscription validation;
- valid Stripe webhook signature accepted;
- duplicate webhook delivery handled idempotently;
- invalid Stripe signature rejected;
- controlled email delivery validated;
- Sentry event ingestion validated;
- Sentry release and source-map binding validated;
- distributed rate limiting observed through HTTP 429;
- Stripe provider connectivity validated;
- provider failure classification validated.

Canonical evidence must not include credentials, provider response bodies, customer identifiers, email addresses, webhook payloads, DSNs, provider URLs, access tokens or raw error messages.

## Scorecard boundary

A successful exact-SHA run can support PLT-02 through PLT-10. Supabase readiness remains governed by the production final validation evidence and is not promoted by this workflow.

Repository code, tests, documentation, endpoint presence or a pull-request run alone do not promote controls.
