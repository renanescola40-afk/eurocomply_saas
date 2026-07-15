# Centralized security alert routing

Date: 2026-07-15  
Status: Proposed

## Context

The server logger already emitted sanitized structured JSON and application exceptions could be sent to Sentry. Standard security events such as audit-chain failure, RLS validation failure and webhook processing failure were written only to stdout, with no stable centralized alert identity. The P1 centralized-logging checker also accepted arbitrary active alerts without requiring evidence for the material events emitted by the application.

## Decision

- keep the existing structured log line as the authoritative local fallback;
- classify standardized security events as none, high or critical;
- route only high and critical events to Sentry when a DSN is configured;
- use the stable fingerprint `security-alert/<event>`;
- attach sanitized context plus application, environment and release tags;
- never overwrite or expose secrets, customer content or raw errors;
- require reviewed production evidence for application, identity, database and edge sources;
- require active reviewed alerts for `audit_chain_invalid`, `rls_validation_failed` and `webhook_failed` before P1-08 can be Complete.

## Trade-offs

Common denial and rate-limit events are not automatically routed because their volume can create alert fatigue. They remain available in structured logs for aggregation and threshold-based provider rules. Sentry configuration and a repository policy do not prove provider ingestion, retention or paging delivery; production smoke evidence remains required.

## Rollback

Revert this change. Structured local logs remain available, but critical security events stop receiving the centralized Sentry fallback and the P1 evidence checker returns to the weaker arbitrary-alert contract. Keep P1-08 Open until an equivalent reviewed route exists.
