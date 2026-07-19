# EuroComply Performance Baseline

Baseline date: 2026-06-24  
Scope: public landing, authenticated dashboard, billing, controlled documents, critical APIs, Supabase query posture, image policy and cache safety.

## Production performance goals

| Area | Target | Hard guardrail |
| --- | ---: | ---: |
| Landing DOMContentLoaded | <= 2.5s on warm production edge | <= 8s in Playwright smoke/dev |
| Landing LCP | <= 2.5s p75 mobile | <= 4.0s p75 mobile |
| Dashboard DOMContentLoaded | <= 3.5s warm authenticated org | <= 10s in Playwright smoke/dev |
| Billing DOMContentLoaded | <= 3.5s warm authenticated org | <= 10s in Playwright smoke/dev |
| Documents DOMContentLoaded | <= 3.5s warm authenticated org | <= 10s in Playwright smoke/dev |
| Critical API health | HTTP 200 | no-store response headers |
| Readiness API | protected by bearer token | unauthorized response is no-store |
| Dashboard query previews | 5 rows per panel | all tenant-scoped by organization or user membership |
| Documents list | 50 rows by default | max page size 100, explicit `range()` |
| Supabase ordered lists | explicit range/limit | no unbounded ordered dashboard/documents query |
| Image optimization | trusted host allowlist | no `hostname: '**'`, no wildcard env hostnames |
| Private route caching | no App Router cache | `noStore()` plus `fetchCache = 'force-no-store'` |

## Current implementation baseline

### Landing

- `src/app/[locale]/page.tsx` renders the marketing homepage as a static ISR route with `revalidate = 300` and no direct Supabase user lookup.
- Authenticated-user redirect from the landing page is handled in middleware, keeping the page itself cacheable.
- Public marketing routes have `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600` in `next.config.ts`.
- Remote image optimization is restricted to an explicit allowlist plus `NEXT_IMAGE_REMOTE_HOSTS` and the configured Supabase hostname.
- `next.config.ts` rejects wildcard image hostnames from environment configuration and scopes CSP `img-src` to trusted image hosts instead of every HTTPS host.

### Dashboard

- `src/app/[locale]/dashboard/organizations/page.tsx` is `force-dynamic` and `force-no-store`.
- Dashboard data fetches call `noStore()` to avoid accidental App Router caching of tenant data.
- Dashboard preview queries select explicit columns, scope by organization, and use `range(0, 4)`.
- Dashboard overview is wrapped in `Suspense` with a skeleton fallback to improve perceived stability while server work streams.
- Organization membership lookup is bounded with `range(0, safeLimit - 1)`.
- Metric history is bounded to a safe maximum of 52 points.

### Billing

- `src/app/[locale]/dashboard/organizations/billing/page.tsx` is `force-dynamic`, `force-no-store`, and calls `noStore()`.
- `getOrganizationBillingContext()` creates one admin client per request and runs bounded tenant-scoped counts in parallel.
- Subscription lookup selects only `plan,status` and filters by `organization_id`.
- Billing route has dedicated loading and error boundaries.

### Documents

- `src/app/[locale]/dashboard/organizations/documents/page.tsx` is `force-dynamic`, `force-no-store`, and calls `noStore()`.
- The canonical document register is server-rendered from tenant-scoped data; upload,
  download and delete controls hydrate as bounded client components rather than
  creating a second browser-owned record authority.
- `listDocuments()` selects explicit columns, filters by `organization_id`, orders by `created_at desc`, and uses explicit pagination with default page size 50 and maximum page size 100.
- Document detail reads include both `id` and `organization_id` filters.
- Documents route has dedicated loading and error boundaries.

### Supabase indexes

Existing migration:

- `supabase/migrations/20260622120000_dashboard_performance_indexes.sql`

Indexes are tenant-first and support dashboard filters/sorts:

- `organization_members(user_id, created_at, organization_id)`
- `compliance_tasks(organization_id, status, due_date)`
- `risks(organization_id, status, risk_score desc)`
- `vendors(organization_id, review_status, risk_level, updated_at)`
- `documents(organization_id, status, expires_at)`
- `compliance_metric_snapshots(organization_id, created_at desc)`

New migration:

- `supabase/migrations/20260624120000_billing_documents_performance_indexes.sql`

Additional indexes support documents pagination and billing usage counts:

- `documents(organization_id, created_at desc)`
- `organization_members(organization_id, created_at)`
- `subscriptions(organization_id)`

## Smoke tests

`tests/e2e/performance-smoke.spec.ts` records browser timing and route stability for:

- Landing: `/pt`
- Dashboard: `/pt/dashboard/organizations`
- Billing: `/pt/dashboard/organizations/billing`
- Documents: `/pt/dashboard/organizations/documents`
- Risks: `/pt/dashboard/organizations/risks`
- Critical health API: `/api/health`
- Protected readiness API: `/api/ready`

## Checks to run before public enterprise launch

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:no-store
npm run security:rls
node scripts/performance/audit.mjs
npx playwright test tests/e2e/performance-smoke.spec.ts --project=chromium
```

For strict timing assertions in CI or a production-preview environment:

```bash
PERFORMANCE_SMOKE_STRICT=true \
LANDING_DCL_BUDGET_MS=2500 \
DASHBOARD_DCL_BUDGET_MS=3500 \
BILLING_DCL_BUDGET_MS=3500 \
DOCUMENTS_DCL_BUDGET_MS=3500 \
npx playwright test tests/e2e/performance-smoke.spec.ts --project=chromium
```

## Lighthouse smoke

Recommended production-preview command after deploy:

```bash
npx lighthouse "$E2E_BASE_URL/pt" \
  --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless" \
  --output=json \
  --output-path=docs/operations/lighthouse-landing.json
```

Minimum launch gate:

- Performance score >= 0.85 on desktop preview.
- No Best Practices or SEO regressions caused by cache/image/config changes.
- Landing LCP p75 from Vercel/Web Vitals remains <= 2.5s after warm traffic.
- Dashboard, billing and documents private routes must not emit cacheable private responses.

## Follow-up monitoring

- Track Vercel Web Vitals p75 and p95 for `/[locale]`, `/[locale]/dashboard/organizations`, `/[locale]/dashboard/organizations/billing`, `/[locale]/dashboard/organizations/documents`, and `/[locale]/dashboard/organizations/risks`.
- Monitor Supabase slow query logs for the indexed dashboard, billing and documents tables after migrations.
- Watch 401/503 rates for `/api/ready`; readiness failures should be actionable and protected from public cache.
- Re-run `node scripts/performance/audit.mjs` after any new dashboard/API query or new client component added under `src/app`.
- Review `scripts/performance/audit.mjs` findings for client page/layout files and heavy client dependencies before merging large UI features.

## Known limitations of this baseline

This document records code-level and smoke-test baselines. Real p75 mobile Core Web Vitals require production or preview telemetry after deployment; local Next dev timings are not a substitute for launch SLOs.
