# 2026-09-04 — Final-release replay and audit concurrency closure

## Status

Implementation prepared for exact-SHA review. No Production database migration or direct Production SQL is authorized by this document.

## Clean schema replay

Production migration `20260904065919_reconcile_ai_governance_runtime_schema_20260904.sql` is preserved byte-for-byte because it records the SQL actually applied to the live provider lineage. Its legacy `actor_id` / `user_id` data backfill is not valid on a clean lineage where `audit_logs.actor_user_id` existed from table creation.

The disposable schema-effect bridge therefore performs a temporary, marker-bound replacement of only that historical data-backfill statement while reconstructing a clean project. The original bytes are restored in `finally` before the proof completes. This transformation is explicitly non-canonical migration history and must never be used as migration-history repair or Production write evidence.

## Audit-chain contention

The Production audit append RPC already serializes organization-scoped writes with `pg_advisory_xact_lock`. The application now keeps the same transactional RPC and fail-closed fallback boundary while increasing bounded previous-hash conflict retries to 128 and introducing capped backoff with jitter between `40001` conflicts. The ceiling is intentionally above the largest reviewed 100-way burst so an unlucky worker can survive a full contention generation while the operation remains finite and fail-closed.

The protected live proof is extended to execute 10, 25, 50 and 100 parallel synthetic writes against one ephemeral tenant. PASS requires:

- every requested event persists;
- zero lost events;
- the complete read-back chain verifies;
- tamper and missing-previous-hash detection remain effective;
- batch conflict counts and latency are recorded without raw tenant/user identifiers;
- synthetic-row cleanup is chunked to avoid oversized REST filters;
- all synthetic audit rows and ephemeral auth fixtures are removed and cleanup is verified.

## Release boundary

This change does not mark `PUBLIC_SAAS_RELEASE_READY=PASS` by itself. The V31 payment/storage migration still requires the repository-governed forward-reconciliation Production promotion lane, followed by exact-SHA Production runtime smoke and authenticated release acceptance.
