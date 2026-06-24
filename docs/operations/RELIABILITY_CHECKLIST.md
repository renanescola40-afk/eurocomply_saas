# EuroComply Reliability Checklist

Last updated: 2026-06-24  
Owner: SRE / Staff Performance Engineering

Use this checklist before production deploys and after incidents touching dashboard, billing, documents, Supabase, cache policy or image configuration.

## 1. Performance and bundle posture

- [ ] Run `npm run build` and inspect `.next` output for unexpectedly large client chunks.
- [ ] Run `node scripts/performance/audit.mjs` after build so bundle manifest evidence is included when available.
- [ ] Review every new `"use client"` file; client boundaries must be limited to components that need browser APIs, local state, event handlers or client-only libraries.
- [ ] Lazy-load heavy interactive surfaces such as document upload workspaces, charting, editors, command palettes and carousels.
- [ ] Keep landing page free of private Supabase user lookups; authenticated redirects belong in middleware or protected routes.

## 2. Cache safety

- [ ] Private app routes use `noStore()` and `fetchCache = 'force-no-store'`.
- [ ] Private API responses use no-store helpers such as `noStoreJson()`.
- [ ] Auth failures, permission denials and quota responses are never cacheable.
- [ ] Public marketing pages may use bounded public caching only when they do not include user, organization, billing, document or entitlement data.
- [ ] Confirm `/api/health` and unauthorized `/api/ready` responses include no-store headers.

## 3. Supabase query safety

- [ ] Tenant-scoped reads include `organization_id` or a documented user-membership scope.
- [ ] Production queries select explicit columns; no `select('*')` in server or API paths.
- [ ] Ordered lists use `range()` or `limit()`.
- [ ] List endpoints enforce safe maximum page sizes.
- [ ] Dashboard preview panels stay capped to 5 rows.
- [ ] Billing usage counts and document lists have tenant-first supporting indexes.
- [ ] Slow query logs are reviewed after migrations and after dashboard/documents feature launches.

## 4. Images and external resources

- [ ] `next.config.ts` does not contain `hostname: '**'`.
- [ ] `NEXT_IMAGE_REMOTE_HOSTS` contains only exact hostnames; wildcard hostnames are rejected.
- [ ] CSP `img-src` is scoped to trusted image hosts, not every HTTPS origin.
- [ ] New image providers are reviewed before adding them to the allowlist.

## 5. Route resilience

- [ ] Dashboard has loading skeleton and error boundary.
- [ ] Billing has loading skeleton and error boundary.
- [ ] Documents has loading skeleton and error boundary.
- [ ] Error boundaries do not print private tenant data to the UI.
- [ ] Server logs include safe structured identifiers such as error name or digest, not document contents or billing secrets.

## 6. Smoke and release gates

Run before merge/release:

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

Strict preview gate:

```bash
PERFORMANCE_SMOKE_STRICT=true \
LANDING_DCL_BUDGET_MS=2500 \
DASHBOARD_DCL_BUDGET_MS=3500 \
BILLING_DCL_BUDGET_MS=3500 \
DOCUMENTS_DCL_BUDGET_MS=3500 \
npx playwright test tests/e2e/performance-smoke.spec.ts --project=chromium
```

## 7. Incident response checks

- [ ] If private data appears cacheable, purge CDN/edge caches and disable affected cache rules before redeploy.
- [ ] If Supabase latency spikes, check tenant-first index usage and recent deploys that added unpaginated lists.
- [ ] If dashboard loads slowly, compare summary counts, preview panels and metric history timings separately.
- [ ] If billing is degraded, fail safely with no-store error UI and avoid exposing Stripe/customer metadata in logs.
- [ ] If document upload/listing is degraded, keep uploads blocked or retriable rather than partially registering metadata without storage.

## 8. Monitoring follow-up

- [ ] Track Web Vitals p75/p95 for landing, dashboard, billing and documents.
- [ ] Track 5xx, 401 and 403 rates for protected routes and critical APIs.
- [ ] Track Supabase slow query logs for `documents`, `organization_members`, `subscriptions`, `compliance_tasks`, `risks`, `vendors` and `compliance_metric_snapshots`.
- [ ] Review bundle/client boundary deltas after major UI changes.
