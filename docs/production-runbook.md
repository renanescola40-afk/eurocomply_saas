# EuroComply Production Runbook

This runbook defines the first-response process for V1 production incidents.

## Alert channels

Use Sentry as the primary error inbox for application exceptions. Configure project alerts for:

- New issue in production.
- Spike in error count.
- Stripe webhook failures.
- Export failures.
- Document upload failures.
- Billing/customer portal failures.
- Excessive rate-limit events.

## Required environment variables

Sentry:

- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN` optional server-only override
- `SENTRY_ORG` optional source map upload
- `SENTRY_PROJECT` optional source map upload
- `SENTRY_AUTH_TOKEN` optional source map upload

Stripe:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Rate limiting:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

If the Upstash variables are empty or unavailable, EuroComply falls back to local in-memory rate limiting. That fallback is acceptable for local development and tests only, not for multi-instance production traffic.

## Incident response checklist

1. Confirm the impacted environment and deployment SHA.
2. Open the related Sentry issue and inspect the stack trace.
3. Check whether the error contains a safe context payload from `reportError()`.
4. Review the latest Vercel deployment logs for the same timestamp.
5. Check Supabase logs for database, auth, or storage errors.
6. If billing-related, check Stripe dashboard events and webhook delivery attempts.
7. If user-impacting, add a short customer-facing status note before investigating deeply.
8. Patch forward with a small commit or rollback to the previous known-good deployment.

## Stripe webhook failure

Severity: High.

Immediate checks:

- Verify `STRIPE_WEBHOOK_SECRET` matches the endpoint in Stripe.
- Open Stripe webhook delivery attempts and retry failed events.
- Confirm subscription state in the `subscriptions` table.
- Confirm customer access did not incorrectly downgrade/upgrade.

Follow-up:

- Add a regression test for the failed webhook event type.
- Add idempotency checks if duplicate events caused the issue.

## Upload failure

Severity: Medium to High depending on affected customer.

Immediate checks:

- Confirm Supabase Storage bucket is private and reachable.
- Verify signed URL expiration and upload size limits.
- Check organization membership and role permissions.
- Confirm the document row is not created without a matching storage object.

Follow-up:

- Add a fixture-based upload E2E test.
- Add cleanup for orphaned document rows or storage objects.

## Export failure

Severity: Medium.

Immediate checks:

- Confirm the route is protected by organization membership.
- Check CSV escaping and large data size.
- Confirm rate limiting did not block legitimate usage.

Follow-up:

- Refactor duplicated CSV helpers into shared export utilities.
- Add E2E coverage for executive, tasks, risks, vendors, and documents exports.

## Billing/customer portal failure

Severity: High.

Immediate checks:

- Check Stripe API response and customer/subscription ids.
- Verify the user has an active organization membership.
- Confirm plan gate does not block paid customers incorrectly.

Follow-up:

- Add billing state UI for `trialing`, `active`, `past_due`, `unpaid`, `canceled`.
- Add tests around plan usage limits.

## Rate-limit spike

Severity: Medium, High if blocking paid users.

Immediate checks:

- Identify route and identifier being limited.
- Check whether traffic is abusive, replayed, or legitimate.
- Confirm Upstash is healthy and the REST token is valid.
- Inspect `Retry-After`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` response headers.
- Temporarily adjust route-specific thresholds only if customer impact is confirmed.

Current distributed coverage:

- Stripe webhook route.
- Executive CSV export.
- Tasks CSV export.
- Risks CSV export.
- Vendors CSV export.
- Documents CSV export.

Follow-up:

- Apply the distributed helper to invitations, checkout, customer portal, and document upload routes.
- Add structured logging for limit hits.
- Add tests around Upstash fallback behavior.
