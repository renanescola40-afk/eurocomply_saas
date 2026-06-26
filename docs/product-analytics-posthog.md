# RISCK COMPLY Product Analytics — PostHog

This implementation adds a privacy-first PostHog layer for RISCK COMPLY. It is designed for B2B compliance data, so analytics must measure product behavior without collecting compliance content.

## Environment variables

Set these in Vercel/production:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
POSTHOG_KEY=phc_xxx
POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT=true
NEXT_PUBLIC_POSTHOG_SESSION_REPLAY=false
```

Use the EU PostHog host for EU/GDPR posture. Keep replay disabled by default. Only enable replay after legal review and keep sensitive routes masked.

## Events

Canonical event names live in `src/lib/analytics/events.ts`.

| Event | Trigger | Allowed properties |
|---|---|---|
| `user_signed_up` | Clerk sign-up or Clerk webhook | source, locale |
| `user_signed_in` | Active Clerk session observed in client | source, has_organization |
| `organization_created` | Onboarding or first active organization observed | source, role, organization_id, clerk_org_id |
| `organization_switched` | Clerk active organization changes | source, clerk_org_id |
| `dashboard_opened` | Dashboard route opened | path, locale, clerk_org_id |
| `document_uploaded` | Upload completed | source, organization_id, clerk_org_id, count |
| `risk_created` | Risk creation succeeds | source, organization_id, clerk_org_id |
| `vendor_created` | Vendor creation succeeds | source, organization_id, clerk_org_id |
| `checkout_started` | Stripe checkout session created | plan, organization_id, clerk_org_id |
| `checkout_completed` | Stripe checkout success/webhook | plan, status, organization_id, clerk_org_id |
| `subscription_active` | Stripe subscription active/trialing | plan, status, organization_id, clerk_org_id |
| `subscription_cancelled` | Stripe subscription deleted/canceled | plan, status, organization_id, clerk_org_id |

Never send company names, user emails, document names, document content, risk descriptions, vendor names, addresses, VAT/tax identifiers, notes, comments, secrets or tokens.

## User and organization identity

- User identity: `distinct_id = Clerk userId`.
- Organization grouping: PostHog group type `company` with `group_key = Clerk orgId` when available.
- Fallback grouping: internal `organization_id` can be included as a property when the Clerk org id is unavailable.

## Privacy controls

Implemented controls:

- `autocapture: false`.
- manual events only.
- `capture_pageview: false`; dashboard opening is captured manually.
- `disable_session_recording: true` by default.
- `mask_all_text: true`.
- `mask_all_element_attributes: true`.
- `respect_dnt: true`.
- optional consent banner via `NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT=true`.
- sensitive route detection for documents, risks, vendors, uploads, settings and billing.

## Feature flags

Create these flags in PostHog:

1. `ai_features`
2. `enterprise_exports`
3. `onboarding_v2`

Client usage:

```ts
import { isProductFlagEnabled, productFlagKeys } from '@/lib/analytics/product-flags';

const enabled = isProductFlagEnabled(productFlagKeys.onboardingV2);
```

## Dashboard: Activation OS

Create a PostHog dashboard called `RISCK COMPLY - Activation OS` with these insights:

### 1. Activation rate

Funnel:

1. `user_signed_in`
2. `organization_created`
3. `dashboard_opened`
4. `document_uploaded` OR `risk_created` OR `vendor_created`

Recommended date range: last 30 days.

### 2. Signup to organization created

Funnel:

1. `user_signed_up`
2. `organization_created`

Breakdowns:

- `source`
- `locale`

### 3. Organization created to first document

Funnel:

1. `organization_created`
2. `document_uploaded`

Breakdown:

- `plan`

### 4. Trial to paid

Funnel:

1. `checkout_started`
2. `checkout_completed`
3. `subscription_active`

Breakdowns:

- `plan`
- `status`

### 5. Churn/cancel

Trends:

- `subscription_cancelled`
- compare against `subscription_active`

Formula:

```text
subscription_cancelled / subscription_active
```

### 6. Organization-level usage

Trends grouped by `company`:

- `dashboard_opened`
- `document_uploaded`
- `risk_created`
- `vendor_created`

## Acceptance checklist

- Events visible in PostHog Live Events.
- `distinct_id` is a Clerk user id.
- Organization group type `company` appears in PostHog.
- Sensitive properties are filtered by `sanitizeAnalyticsProperties`.
- Session replay is off by default and sensitive routes are protected.
- Feature flags exist in PostHog and client helper can read them.
- Activation OS dashboard exists with the funnel definitions above.
