# Rollback Runbook

## Purpose

This runbook defines how to safely roll back EuroComply when a release causes availability, security, billing, upload, audit-chain or customer-impacting regressions.

Rollback is a safety control. Do not delay rollback while searching for root cause when the current release is customer-impacting and a previous known-good deployment exists.

## Release preconditions

Every production/enterprise release must record:

- release owner;
- incident owner;
- rollback owner;
- customer communication owner;
- promoted commit SHA;
- previous known-good commit SHA or deployment ID;
- database migration summary;
- config/environment changes;
- rollback trigger threshold;
- post-rollback validation owner.

Release is **No-Go** if incident owner or rollback owner is missing.

## Rollback triggers

Rollback is mandatory unless the incident commander explicitly approves a safer mitigation when:

- `/api/ready` fails after deployment and the failure is release-correlated;
- Sentry error rate spikes after deployment and affects critical flows;
- tenant isolation, RLS, RBAC or audit-chain behavior is uncertain;
- billing webhook processing is broken or creates incorrect customer state;
- uploads are incorrectly accepted without scanning or clean uploads are broadly blocked;
- step-up auth is bypassed or unavailable for protected actions;
- customer impact is growing faster than the team can safely patch forward.

## Application rollback

1. Confirm current deployment SHA and previous known-good deployment.
2. Freeze additional deploys.
3. Announce rollback decision in the incident channel.
4. Promote or restore the previous known-good deployment using the hosting provider rollback path.
5. Preserve the failed deployment SHA and Sentry release ID for post-incident review.
6. Verify `/api/health` publicly.
7. Verify `/api/ready` with `HEALTHCHECK_TOKEN`.
8. Validate auth, dashboard load, document upload/download, billing portal/checkout when touched, and audit event creation.

## Database rollback

Database rollback is never automatic unless the migration is explicitly reversible and tested.

Before database rollback:

- list migrations applied by the release;
- identify destructive or data-shaping changes;
- confirm whether app rollback remains compatible with the migrated schema;
- preserve audit-chain rows before mutation;
- identify Supabase backup/restore options and expected data loss window;
- get incident commander and database owner approval.

Do not roll back database state if it would make tenant isolation or audit-chain integrity worse without a documented containment plan.

## Configuration rollback

Review and restore configuration changes for:

- `HEALTHCHECK_TOKEN` monitor routing;
- Supabase URL/service role secret reference;
- Stripe webhook secret and price IDs;
- Upstash Redis URL/token;
- Sentry DSN/org/project/auth token;
- upload malware scanner provider and endpoint;
- step-up signing/provider configuration;
- cron/internal maintenance secrets.

Never paste or publish secret values in incident notes. Reference provider secret names and evidence screenshots stored outside the repository.

## Post-rollback validation

Required checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run security:logs
npm run build
```

Runtime checks:

- `/api/health` returns 200.
- `/api/ready` returns 200 with bearer healthcheck token.
- Sentry error rate returns to baseline.
- No `rls_validation_failed` or `audit_chain_invalid` events occur after rollback.
- Stripe webhook receives and verifies a safe test event if billing was touched.
- Upload scanner blocks unsafe files and allows known-clean files in the target environment.
- Audit event creation works.

## Customer communication handoff

If customers were affected:

1. Customer communication owner sends mitigation/rollback update.
2. Include what changed from the customer perspective.
3. Avoid internal stack traces, secrets, raw logs, exploit detail or PII.
4. Provide closure update after validation is complete.

Use `docs/operations/CUSTOMER_COMMUNICATION_RUNBOOK.md` for templates.

## Closure

Rollback is complete only when:

- rollback owner marks application/config/database decision complete;
- incident owner confirms service health;
- evidence owner stores sanitized evidence;
- customer communication owner confirms external updates when required;
- a post-incident review is scheduled with owner and due date.
