# Final technical evidence promotion

Date: 2026-08-05

Status: Accepted

## Context

The protected `Final Technical Controls Proof` already performs two destructive-looking
checks safely with synthetic fixtures: Storage owner/outsider isolation with object
cleanup, and security-event persistence inside an isolated database transaction that is
rolled back. The workflow emits one redacted, exact-SHA artifact.

The Enterprise Readiness Scorecard expects separate canonical documents for TEN-10 and
OPS-03. Before this decision, it neither retrieved the protected artifact nor derived
those documents, so a successful real proof could not affect the scorecard. TEN-09 uses
separate audit-chain isolation evidence and must not be inferred from event persistence.

## Decision

The scorecard listens for successful `Final Technical Controls Proof` completion and uses
a bounded artifact fetcher to promote only a successful `workflow_dispatch` run for the
exact assessed `main` SHA. The source artifact must prove every canonical check, cleanup,
rollback, redaction and run binding.

One accepted source derives:

- `security-events-validation.json`, covering only the `securityEvents` check;
- `storage-tenant-isolation-validation.json`, covering owner access, outsider denial,
  synthetic-object cleanup and session revocation.

The fetcher removes stale canonical files before lookup, rejects ambiguous or unsafe ZIP
entries, bounds API/artifact/evidence sizes and never stores raw provider responses.

## Evidence boundary

Repository tests and this integration do not close TEN-10 or OPS-03. They remain
`NOT_VERIFIED` until the protected workflow succeeds with configured synthetic accounts,
the target Supabase project, the isolated recovery database and the exact current `main`
SHA. The proof does not cover every storage bucket, customer data, SIEM delivery,
retention, production customer traffic or external review. TEN-09 remains independently
`NOT_VERIFIED` until tenant isolation of the audit chain is proven by its own evidence.

## Rollback

Revert the fetcher, workflow wiring, tests and this decision record. The scorecard will
return these controls to `NOT_VERIFIED`; no provider state or database schema is changed.
