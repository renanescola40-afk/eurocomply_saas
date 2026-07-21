# Enterprise Workflow Automation Runbook

## Purpose
Operate and investigate enterprise workflow instances without bypassing tenant isolation, approvals or immutable history.

## Health indicators
- no active instance past its global due date;
- no ready/running/approval step past its SLA without escalation;
- no duplicate idempotency key;
- no active template without independent approval;
- no event-chain gap;
- failed webhooks/tasks use bounded retries and stable failure codes.

## Triage
1. Identify the organization, correlation ID and instance status.
2. Inspect step runs in sequence order and compare `due_at` with current time.
3. Confirm the template version is active and independently approved.
4. Verify approvals meet the configured threshold and no rejection exists.
5. Validate the event chain from the first event to the current hash.
6. Check retry count; never reset idempotency keys or delete history.

## Recovery
- transient task/webhook failure: retry with the same idempotency key and increment attempt count;
- stale assignment: reassign only through an audited service action;
- missed SLA: create the next bounded escalation level and notify the configured role;
- corrupt definition: pause the template, create a new version and approve it independently;
- irrecoverable execution: mark failed with a stable code, preserve history and start a new correlated instance when approved.

## Prohibited actions
Do not update/delete workflow events or approval decisions, edit an active template in place, weaken RLS, expose event payloads in logs, or mark an instance completed without all required steps.

## Evidence
Evidence must contain exact commit SHA, migration identifier, boolean control outcomes, counts only, and no customer content, actor email, tokens, URLs with credentials or raw webhook payloads.
