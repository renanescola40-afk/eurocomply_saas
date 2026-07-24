# Runbook: Enterprise reconciliation queue

## Trigger

Use this runbook when backlog age exceeds 15 minutes, dead-letter jobs appear, or the worker endpoint returns 503.

## Triage

1. Call the protected status endpoint and record counts only.
2. Confirm `ENTERPRISE_RECONCILIATION_ACTOR_USER_ID` is configured as a valid UUID.
3. Confirm the internal cron secret is present and unchanged.
4. Check Supabase availability and database connection saturation.
5. Check whether processing jobs have exceeded their lease duration.
6. Do not copy raw customer payloads or secrets into tickets.

## Recovery

- Drain a bounded batch, starting with `limit=10`.
- Increase gradually to 25 or 50 only when latency and error rates remain healthy.
- Replay a dead-letter job only after the underlying cause is corrected.
- Replay requires both `jobId` and `organizationId`; a mismatch fails closed.
- Prune completed history only through the retention endpoint, never direct SQL during an incident.

## Rollback

Disable the scheduler invoking the drain endpoint. Existing queued jobs remain durable. Revert the application change before rolling back the additive operations migration.

## Evidence

Record deployment SHA, status counters before/after, sanitized error code, operator, replayed job IDs and resolution timestamp. Never record access tokens, request bodies or identity-provider secrets.
