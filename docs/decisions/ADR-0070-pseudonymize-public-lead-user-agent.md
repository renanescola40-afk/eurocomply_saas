# ADR-0070: Pseudonymize public lead user-agent context

- Status: Proposed
- Date: 2026-07-15
- Decision owners: Engineering, Security, Privacy

## Context

`POST /api/leads` records a lead in `sales_leads` and can forward the same record to `RISCK_COMPLY_LEAD_WEBHOOK_URL`. The record already minimizes the client IP by storing a salted derived identifier, but it stored the complete `User-Agent` header (up to 300 characters).

A full user-agent string can contain detailed browser, operating-system, device and automation-client information. The lead capture workflow does not require that raw value to contact the lead, deduplicate submissions, deliver the webhook or operate its rate limit. Persisting and forwarding the raw header therefore retained more network/device context than the workflow needs.

This finding is based on repository source. It does not claim that a production row or webhook delivery contained a particular user-agent, that the value uniquely identified a person, or that a regulatory breach occurred.

## Decision

Use the existing salted `hashRateLimitUserAgent` primitive before assigning `sales_leads.user_agent`.

- A present non-empty header becomes a derived identifier.
- A missing or blank header remains `null`.
- The raw header is not placed in the database record or webhook payload.
- The database column and outbound payload shape remain unchanged.

## Impact

New lead records and webhook payloads created by `/api/leads` no longer contain the raw user-agent header. Existing rows and previous webhook deliveries are not modified.

There are no migrations, dependencies, provider mutations, secret changes, RBAC changes, RLS changes or entitlement changes.

## Risks and trade-offs

- Operators lose direct browser/device diagnostics from new lead records.
- The derived value is pseudonymous context, not proof of anonymization.
- Changing the configured hashing salt changes future derived identifiers.
- This decision currently covers `/api/leads`; other collection paths must be reviewed independently rather than being claimed as covered.

## Tests

A focused source-contract test requires the shared hashing primitive, requires `null` for a missing header and rejects the former raw-header assignment.

GitHub Actions remains authoritative for lint, typecheck, unit tests, build and security checks on the exact pull-request head.

## Evidence boundary

The evidence is limited to repository source, diff and tests. No runtime evidence, production-data inspection, provider-delivery proof, external audit or penetration test is asserted.

## Rollback

Revert the pull request. New `/api/leads` records and webhook payloads will again contain the truncated raw user-agent string. No schema rollback, data migration, credential rotation or provider-side rollback is required.
