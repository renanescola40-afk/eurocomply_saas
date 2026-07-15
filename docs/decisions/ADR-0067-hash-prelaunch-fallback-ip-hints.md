# ADR-0067: Hash prelaunch fallback IP hints

- Status: Proposed
- Date: 2026-07-15
- Scope: `POST /api/prelaunch`

## Context

The public prelaunch waitlist keeps a dedicated `waitlist_leads` persistence path and falls back to `sales_leads` or an outbound lead webhook when that table or database path is unavailable.

The fallback record previously copied the first forwarded IP value into `ip_hint` without transformation. The normal `/api/leads` capture path already stores only a salted derived identifier through `hashRateLimitIp`. As a result, the degraded waitlist path retained and transmitted more network-identifying data than the primary lead path required.

This finding is based on repository source only. It does not establish production use of the fallback, data exposure, provider delivery, regulatory non-compliance, external audit findings, or penetration-test results.

## Decision

Use the existing `hashRateLimitIp` primitive before adding an IP hint to the fallback sales-lead record. Return `null` when no client hint is available.

Because the webhook receives the same fallback record, it also receives only the derived hint rather than the raw forwarded value.

Keep the raw request hint available only transiently for the existing distributed rate-limit call. Do not change rate-limit keys, limits, failure mode, consent validation, honeypot handling, email delivery, waitlist persistence, or webhook routing.

## Impact

- fallback `sales_leads.ip_hint` values become salted, truncated SHA-256-derived identifiers;
- the lead webhook no longer receives the raw forwarded IP through the fallback record;
- duplicate detection, contact fields, locale, status, and response behavior remain unchanged;
- no migration, dependency, RLS, RBAC, entitlement, secret, or provider change is introduced.

Existing historical rows or webhook deliveries are not rewritten by this change.

## Risks and trade-offs

- operators can no longer use fallback records to recover a raw client IP;
- changing the configured hash salt changes future derived identifiers;
- forwarded headers remain deployment-bound input and are not asserted here to be cryptographically trustworthy;
- hashing is data minimization, not anonymization proof;
- repository tests do not prove production deployment or deletion of historical raw values.

## Tests and evidence

A focused security contract requires:

- use of the existing salted `hashRateLimitIp` primitive;
- `null` for an unavailable client hint;
- the fallback record to use `getPrivacySafeIpHint`;
- absence of the previous direct raw-IP assignment.

GitHub Actions is authoritative for lint, typecheck, unit tests, build, security suites, CodeQL, Semgrep, Gitleaks, dependency review, enterprise gates, and release checks on the exact pull-request head.

No runtime evidence document is created or modified by this change.

## Rollback

Revert this PR. New fallback records and webhook payloads will again contain the raw forwarded IP hint. No schema rollback, data migration, provider action, credential rotation, or customer-data repair is required for the code rollback. Any historical-data remediation would remain a separate operational decision.
