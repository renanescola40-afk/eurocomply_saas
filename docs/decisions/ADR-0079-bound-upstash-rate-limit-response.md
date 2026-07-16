# ADR-0079: Bound Upstash rate-limit responses

## Status

Accepted.

## Date

2026-07-16

## Context

The shared production rate limiter calls the Upstash Redis REST pipeline with a three-second application-level timeout and fails closed when Redis is unavailable.

Before this change, a successful provider response was parsed with `Response.json()` without an application byte limit. A malformed, compromised, or unexpectedly large response could therefore be buffered before parsing. Because the rate limiter protects sensitive API routes, its provider boundary should remain small and deterministic.

This finding is based on repository source only. It does not establish a production incident, exploit, provider compromise, external audit result, or penetration-test finding.

## Decision

Successful Upstash responses are limited to 64 KiB before JSON parsing.

The implementation:

- rejects declared `Content-Length` values above the limit before reading;
- reads chunked or undeclared-length responses through the body stream;
- counts raw bytes and cancels the reader immediately on overflow;
- decodes UTF-8 with fatal error handling;
- parses JSON only after the bounded read completes;
- preserves the existing three-second request timeout and fail-closed production behavior.

## Consequences

A legitimate Upstash response larger than 64 KiB is treated as an unavailable security control. In production, the request remains blocked through the existing fail-closed path. Accepted responses are still buffered up to the configured limit because the pipeline payload must be parsed as JSON.

No database migration, dependency, RBAC, RLS, entitlement, secret, or provider configuration change is required.

## Evidence boundary

Evidence is limited to repository source, diff, focused regression contracts, and automated CI on the exact pull-request head. This ADR does not prove production deployment, observed memory reduction, provider behavior, incident remediation, legal compliance, external audit completion, or penetration-test coverage.

## Rollback

Revert the pull request. The rate limiter will again parse successful Upstash responses with unbounded `Response.json()`. No schema rollback, migration, provider action, credential rotation, or customer-data repair is required.
