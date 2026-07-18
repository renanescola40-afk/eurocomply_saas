# Fail closed when audit-chain verification cannot be audited

Date: 2026-07-18
Status: Proposed

## Context

`GET /api/audit/chain/verify` exposes organization-scoped audit-chain verification results, including chain hashes, anchor information, failure details, and the integrity status of loaded events. The route already requires authentication, `read_audit`, Business-plan entitlement, step-up verification, tenant scoping, bounded input, and distributed rate limiting.

The route also writes `audit_chain.verified`, but previously returned the verification result even when the audit writer explicitly reported `persisted: false`. That created an accountability gap around a security-sensitive integrity operation.

## Decision

Require durable persistence of `audit_chain.verified` before returning verification details. When persistence is unavailable, return a no-store HTTP 503 response with `audit_chain_verification_audit_unavailable` and emit only a fixed operational warning.

Successful responses now report `verificationAuditEvent.persisted: true` because the failure path exits before disclosure.

## Impact

Security and governance accountability improve because a successful verification disclosure always has durable audit evidence. Existing authentication, authorization, plan, step-up, rate-limit, tenant, and verification logic remain unchanged.

Availability is intentionally reduced during audit persistence outages: authorized users must retry instead of receiving unaudited verification results.

## Risks

The audit chain may be unhealthy at the same time the audit writer is unavailable, delaying access to diagnostic details. This is an intentional fail-closed trade-off for a privileged integrity endpoint. Operators should use sanitized service telemetry and restore audit persistence before retrying.

## Evidence boundaries

This change and its static regression test prove only the application control flow. They do not prove production database availability, runtime audit-chain correctness, external audit completion, or penetration-test results.

## Rollback

Revert the route, test, and this decision record together. Rolling back restores the previous fail-open behavior and must be treated as an explicit security-accountability regression.
