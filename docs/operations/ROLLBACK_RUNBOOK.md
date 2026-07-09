# Rollback Runbook

## Purpose

This runbook defines how to safely roll back RISCK COMPLY when a release causes availability, security, billing, upload, audit-chain or customer-impacting regressions.

Rollback is a safety control. Do not delay rollback while searching for root cause when the current release is customer-impacting and a previous known-good deployment exists.

## Release preconditions

Every production/enterprise release must record:

- release owner;
- incident owner;
- rollback owner;
- support owner;
- customer communication owner;
- escalation path;
- promoted commit SHA;
- build SHA;
- previous known-good deployment URL or deployment ID;
- previous known-good commit SHA;
- database migration summary;
- config/environment changes;
- feature flag changes;
- Stripe webhook/config changes;
- rollback trigger threshold;
- post-rollback validation owner.

Release is **No-Go** if incident owner, rollback owner, support owner, previous known-good deployment, previous known-good commit, escalation path or rollback dry-run evidence is missing.

## Required runtime configuration

The dry-run script accepts these variables:

| Variable | Purpose |
| --- | --- |
| `RELEASE_ROLLBACK_TARGET` | Primary previous known-good deployment URL. |
| `RELEASE_ROLLBACK_TARGET_URL` | Explicit previous known-good deployment URL. |
| `LAST_KNOWN_GOOD_DEPLOYMENT_URL` | Alternative previous known-good deployment URL. |
| `RELEASE_ROLLBACK_TARGET_SHA` | Full 40-character SHA for the previous known-good commit. |
| `RELEASE_ROLLBACK_TARGET_COMMIT_SHA` | Explicit previous known-good commit SHA for enterprise release records. |
| `LAST_KNOWN_GOOD_COMMIT_SHA` | Alternative previous known-good commit SHA. |
| `LAST_KNOWN_GOOD_SHA` | Legacy alternative previous known-good commit SHA. |
| `RELEASE_ROLLBACK_TARGET_VALIDATED=true` | Manual proof that the target was functionally validated. Set only after validation. |
| `RELEASE_ROLLBACK_CHECK_READY=true` | Optional protected `/api/ready` check against the rollback target. Requires `HEALTHCHECK_TOKEN`. |
| `RELEASE_ROLLBACK_TIMEOUT_MS` | Optional request timeout override. |

Do not commit raw secret values, private provider screenshots or internal rollback URLs. Evidence files may record variable names, SHA prefixes and redacted status only.

## Dry-run command

```bash
npm run release:rollback:dry-run
```

The command must:

- validate a rollback target URL is configured and valid;
- validate a previous known-good SHA is configured;
- verify the rollback SHA is not the current release SHA when current SHA is known;
- call the rollback target `/api/health`;
- verify `Cache-Control` includes `no-store` on rollback health;
- optionally call protected `/api/ready` when enabled;
- write `docs/security/evidence/runtime/rollback-dry-run-validation.json`;
- record `mutatesProduction=false`;
- fail the process if any critical check fails.

Do **not** mark rollback ready if the dry-run evidence is `Open` or `failed`.

## Rollback triggers

Rollback is mandatory unless the incident commander explicitly approves a safer mitigation when:

- `/api/ready` fails after deployment and the failure is release-correlated;
- Sentry error rate spikes after deployment and affects critical flows;
- tenant isolation, RLS, RBAC or audit-chain behavior is uncertain;
- billing webhook processing is broken or creates incorrect customer state;
- uploads are incorrectly accepted without scanning or clean uploads are broadly blocked;
- auth/step-up is bypassed or unavailable for protected actions;
- Redis/rate-limit controls fail open for sensitive endpoints;
- customer impact is growing faster than the team can safely patch forward.

## Vercel deployment rollback

1. Confirm current deployment SHA/build SHA and previous known-good deployment.
2. Freeze additional deploys.
3. Announce rollback decision in the incident channel.
4. Configure `RELEASE_ROLLBACK_TARGET` or `LAST_KNOWN_GOOD_DEPLOYMENT_URL`.
5. Configure `RELEASE_ROLLBACK_TARGET_SHA`, `RELEASE_ROLLBACK_TARGET_COMMIT_SHA` or `LAST_KNOWN_GOOD_COMMIT_SHA`.
6. Set `RELEASE_ROLLBACK_TARGET_VALIDATED=true` only after functional validation.
7. Run `npm run release:rollback:dry-run`.
8. Promote or restore the previous known-good deployment using the hosting provider rollback path.
9. Preserve the failed deployment SHA and Sentry release ID for post-incident review.
10. Verify `/api/health` publicly.
11. Verify `/api/ready` with `HEALTHCHECK_TOKEN`.
12. Validate auth, dashboard load, document upload/download, billing portal/checkout when touched, and audit event creation.
13. Attach sanitized evidence and customer communication timestamps.

## Supabase migration rollback / forward-fix

Database rollback is never automatic unless the migration is explicitly reversible and tested.

Before database rollback:

- list migrations applied by the release;
- identify destructive or data-shaping changes;
- confirm whether app rollback remains compatible with the migrated schema;
- preserve audit-chain rows before mutation;
- identify Supabase backup/restore options and expected data loss window;
- get incident commander and database owner approval.

Prefer forward-fix for Supabase migrations unless rollback is proven safe. Do not roll back database state if it would make tenant isolation or audit-chain integrity worse without a documented containment plan.

## Stripe webhook replay and idempotency

When billing/webhook behavior is affected:

1. Preserve Stripe event IDs and delivery attempts.
2. Confirm raw-body signature verification is intact.
3. Confirm webhook idempotency before replay.
4. Do not rotate `STRIPE_WEBHOOK_SECRET` during rollback without updating both Vercel and Stripe.
5. Replay only after a safe test event verifies.
6. Reconcile subscriptions/entitlements after replay.

## Feature flag rollback

When a feature flag caused impact:

- prefer disabling the flag over redeploy when it safely restores service;
- record flag name, old value, new value, owner and timestamp;
- validate affected flows after the flag change;
- keep the rollback owner responsible for closure evidence.

## Configuration/env rollback

Review and restore configuration changes for:

- `HEALTHCHECK_TOKEN` monitor routing;
- Supabase URL/service role secret reference;
- Stripe webhook secret and price IDs;
- Upstash Redis URL/token;
- Sentry DSN/org/project/auth token;
- PostHog/analytics consent and capture keys;
- upload malware scanner provider and endpoint;
- auth/step-up signing/provider configuration;
- cron/internal maintenance secrets.

Never paste or publish secret values in incident notes. Reference provider secret names and evidence screenshots stored outside the repository.

## Post-rollback validation

Required checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run security:logs
npm run release:observability-smoke
npm run release:rollback:dry-run
npm run build
```

Runtime checks:

- `/api/health` returns 200.
- `/api/ready` returns 200 with bearer healthcheck token.
- Sentry error rate returns to baseline.
- `/api/observability/smoke` rejects anonymous calls and emits a protected smoke event when enabled.
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

Use `docs/operations/CUSTOMER_COMMUNICATION_RUNBOOK.md` for templates when available.

## Closure

Rollback is complete only when:

- rollback owner marks application/config/database decision complete;
- incident owner confirms service health;
- evidence owner stores sanitized evidence;
- customer communication owner confirms external updates when required;
- a post-incident review is scheduled with owner and due date.
