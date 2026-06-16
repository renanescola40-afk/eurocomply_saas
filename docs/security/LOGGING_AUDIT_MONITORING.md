# Logging, audit and monitoring runbook

## Logging rules

Application logs must be useful for incident response without exposing user data or credentials.

Never log raw values for:

- passwords or password reset payloads
- access tokens, refresh tokens, ID tokens or JWTs
- `Authorization` headers or bearer strings
- cookies or `Set-Cookie` headers
- Supabase service role keys
- Stripe secrets or webhook secrets
- full email addresses, phone numbers or addresses
- uploaded document contents or file bodies
- payment card data, IBANs or government identifiers

Allowed log fields:

- stable event names
- request id / correlation id
- organization id when needed for tenant incident response
- actor user id when needed for audit correlation
- coarse error codes
- boolean flags
- counts and durations

Prefer this shape:

```ts
console.warn('[billing] checkout_failed', {
  code: error.code ?? 'unknown',
  organizationId,
});
```

Avoid this shape:

```ts
console.error('request failed', { request, headers, token, email, password });
```

The CI check `npm run security:logs` blocks common unsafe console logs and sensitive literals.

## Audit table

EuroComply already uses an `audit_events` table with hash-chain integrity. Critical audit records should include:

- `id`
- `organization_id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata`
- `created_at`
- `previous_hash`
- `event_hash`
- `hash_algorithm`
- `hash_signature`

Keep audit metadata minimal. Do not put raw secrets, access tokens, full request bodies or uploaded file contents in `metadata`.

## Critical actions to audit

Record audit events for:

- login success
- login failure threshold exceeded
- logout
- signup
- password reset requested
- password changed
- email changed
- MFA or step-up challenge created
- MFA or step-up verification failed
- organization created
- organization settings changed
- member invited
- member removed
- member role or permissions changed
- billing checkout started
- billing portal opened
- subscription changed
- document uploaded
- document deleted
- export generated
- evidence pack verified
- audit chain verification run
- API token created or revoked, if API tokens are added later

Use stable action names such as `member_role_changed`, `document_uploaded`, `billing_portal_opened`.

## Monitoring and alerting

Use Sentry or an equivalent error monitoring provider for application exceptions. Use structured logs from Vercel plus Supabase logs for operational events.

Recommended alerts:

- critical unhandled exception rate exceeds baseline
- repeated failed login attempts by IP, user or organization
- multiple step-up failures
- sudden spike in 401/403 responses
- rate-limit saturation on auth, export or upload endpoints
- service role client initialization failure in production
- audit event persistence failure
- audit chain verification failure
- Stripe webhook signature verification failure spike
- malware scanner unavailable while uploads are enabled
- storage bucket policy violation or unexpected public access
- Vercel production deploy failure

## Suggested integrations

- Sentry for application errors and performance traces.
- Vercel Observability or log drains for request/error trends.
- Supabase logs for database, auth and storage signals.
- Slack, PagerDuty or Opsgenie for alert routing.
- GitHub Actions summaries for release/security readiness evidence.

## Incident response evidence

For each security incident, collect:

- timeframe
- affected organization/user ids
- relevant audit event ids and hashes
- deployment SHA
- Sentry issue id or log query link
- containment action
- secret rotation status, if relevant
- follow-up ticket or pull request
