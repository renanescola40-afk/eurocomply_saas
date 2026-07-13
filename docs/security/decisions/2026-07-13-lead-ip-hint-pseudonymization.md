# Lead capture IP hint pseudonymization

Date: 2026-07-13
Status: Proposed

## Context

`POST /api/leads` accepts public sales enquiries and forwards the same lead record to Supabase and an optional sales webhook. The record previously included the first forwarded IP address verbatim in `ip_hint`.

The route needs a short-lived network identifier for abuse controls, but durable lead storage and downstream sales integrations do not require a directly readable IP address. Repository inspection establishes this data-flow gap only; it does not prove production collection, retention, misuse, or a regulatory violation.

## Decision

Keep the raw request IP available only for the existing in-request rate-limit decision. Before constructing the record used by Supabase and the sales webhook:

- convert a present IP to the existing salted SHA-256-derived `hashRateLimitIp` representation;
- persist `null` when no trustworthy IP hint is available;
- do not change lead validation, consent, rate limiting, storage fallbacks, webhook behavior, or response semantics.

## Impact

New lead records and webhook payloads no longer contain a directly readable client IP in `ip_hint`. The field remains stable enough for limited correlation under the configured application salt.

No database migration is required because the field remains a nullable string. Existing records are not rewritten or claimed to be remediated by this change.

## Risks

- Operational staff lose direct IP visibility in newly captured lead records.
- Changing the configured hash salt changes future pseudonymous values and prevents correlation across the rotation boundary.
- A salted hash is pseudonymous data, not anonymous data, and must still be handled according to applicable retention and access controls.

## Tests and evidence

- `tests/security/lead-capture-ip-privacy.test.ts` enforces hashing before both persistence and webhook dispatch.
- GitHub Actions on the pull request are the authoritative execution evidence.
- This record is not an audit, pentest, production validation, or compliance certification.

## Rollback

Revert the pull request. No schema, data, credential, provider, or infrastructure rollback is required. Reverting restores verbatim IP hints for future records and should therefore require an explicit privacy and security review.
