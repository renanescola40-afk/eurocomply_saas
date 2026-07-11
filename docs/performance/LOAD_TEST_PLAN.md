# Load Test Plan

Review date: 2026-07-11

## Objective

Establish a safe, repeatable performance baseline for RISCK COMPLY without attacking production or third-party providers. This plan covers public pages, health/readiness, authenticated dashboard flows and critical APIs using synthetic tenants and test-mode dependencies.

Performance evidence is operational proof for a specific environment and commit. It is not a general scalability guarantee.

## Safety rules

- Default target is localhost or an isolated staging deployment.
- A remote target requires `ALLOW_REMOTE_LOAD_TEST=true` and an exact host in `LOAD_TEST_ALLOWED_HOSTS`.
- Do not point the runner at an unrelated or third-party service.
- Use synthetic tenants and Stripe test mode only.
- Do not include customer data, cookies, bearer tokens or service-role credentials in repository evidence.
- Begin with low concurrency and stop on elevated errors, rate-limit saturation or provider impact.
- Coordinate any production test with SRE, security, database and provider owners.
- Respect provider plan limits and terms.

## Repository smoke runner

The dependency-free runner is:

```bash
LOAD_TEST_BASE_URL=http://127.0.0.1:3000 \
LOAD_TEST_REQUESTS=60 \
LOAD_TEST_CONCURRENCY=4 \
node scripts/performance/run-http-load-smoke.mjs
```

For an approved staging host:

```bash
ALLOW_REMOTE_LOAD_TEST=true \
LOAD_TEST_ALLOWED_HOSTS=staging.example.com \
LOAD_TEST_BASE_URL=https://staging.example.com \
LOAD_TEST_PATHS=/,/pricing,/api/health \
LOAD_TEST_REQUESTS=100 \
LOAD_TEST_CONCURRENCY=5 \
node scripts/performance/run-http-load-smoke.mjs
```

Hard limits in the script:

- maximum 500 requests per run;
- maximum concurrency 10;
- GET only;
- no auth/cookies;
- no response-body persistence;
- no raw target URL in evidence;
- non-2xx/3xx/4xx responses and network failures count as errors;
- evidence written to `docs/security/evidence/runtime/load-smoke-validation.json`.

The smoke runner is intentionally small. Use a controlled k6/Artillery/Locust setup in private infrastructure for authenticated scenario testing rather than adding a large application dependency.

## Test environments

### Local CI smoke

Purpose: detect obvious regressions, startup failures and route latency spikes.

- built Next.js server;
- placeholder public Supabase configuration where tests do not require real auth;
- low request volume;
- no external billing/email calls.

### Staging baseline

Purpose: measure realistic application/database behavior.

- production-like Vercel/Supabase topology;
- synthetic tenant A/B data;
- test-mode Stripe;
- real configured Redis and upload scanner where enterprise gates require them;
- Sentry test project or tagged staging environment;
- current migrations and build SHA.

### Controlled production canary

Purpose: validate low-volume behavior after approval, not discover capacity limits.

- explicit change window and owner;
- small allowlisted routes;
- concurrency <= 5 unless separately approved;
- stop conditions and rollback target ready;
- no high-risk mutations;
- customer-impact monitoring active.

## Workload stages

### Stage 0: functional smoke

- 1 user/concurrency;
- 3-10 requests per critical route;
- confirm status, headers, no-store and sanitized errors;
- run before any higher load.

### Stage 1: baseline

- concurrency 2-5;
- 50-200 total requests;
- public landing, pricing, trust and health;
- record application and provider metrics.

### Stage 2: authenticated read workload

Private harness only:

- synthetic owner/admin/viewer accounts;
- dashboard organizations, document list, risk/vendor/task lists, audit log pagination;
- tenant A/B isolation assertions during load;
- no real customer records.

### Stage 3: bounded mutation workload

Private harness only:

- create/update synthetic risks/tasks/vendors;
- upload clean synthetic fixtures through real scanner in staging;
- test rate limits and idempotency;
- Stripe test checkout/webhook fixtures only;
- cleanup or deterministic reset after run.

### Stage 4: soak

- 30-120 minutes at modest expected concurrency;
- observe memory, connection pool, database locks, rate-limit store and error growth;
- do not run until Stages 0-3 pass.

### Stage 5: stress/capacity discovery

Not approved by this document. Requires a dedicated staging environment, provider capacity review, explicit maximums and incident/rollback coverage.

## Metrics and initial budgets

| Metric | Initial target | Blocking condition |
| --- | --- | --- |
| LCP | p75 <= 2.5 s on key public/authenticated routes | sustained regression above target without accepted plan |
| CLS | p75 <= 0.1 | layout shift affecting navigation/forms |
| INP | p75 <= 200 ms | interaction delay affecting core workflow |
| Public API p95 | <= 500 ms | > 1 s or rising error rate |
| Critical authenticated API p95 | <= 800 ms excluding provider latency | > 1.5 s or timeout growth |
| API p99 | <= 2 s for normal application routes | > 3 s or unstable tail |
| Dashboard usable time | <= 3 s under staging baseline | > 5 s or incomplete state |
| Error rate | < 1% | >= 1% unexplained; immediate stop >= 5% |
| Readiness failures | 0 | any dependency/readiness failure |
| Cross-tenant authorization failures | 0 unsafe allows | any unsafe allow is SEV-1/No-Go |

Budgets must be recalibrated from real measurements. They are targets, not evidence that the product currently meets them.

## Observability during tests

Capture by commit/build SHA:

- request count, status and latency by route;
- p50/p95/p99;
- Sentry errors and release tags;
- Vercel function duration/errors;
- Supabase query latency, locks, connections and slow statements;
- Redis/rate-limit errors and denials;
- upload scanner latency and unavailable/timeout verdicts;
- Stripe test webhook backlog/idempotency;
- dashboard Web Vitals;
- application request/correlation ids for failed samples.

Do not commit raw logs containing PII, authorization headers, cookies, DSNs, database URLs or customer payloads.

## Stop conditions

Stop immediately when:

- error rate reaches 5%;
- readiness becomes unhealthy;
- database connection or lock saturation appears;
- cross-tenant, RBAC or auth behavior is unsafe;
- upload scanner starts failing open or accepting unknown verdicts;
- Stripe/webhook idempotency is uncertain;
- provider limits or unrelated customers may be affected;
- Sentry/logging becomes blind during the run.

## Evidence template

Each approved run should record:

- environment and redacted target host;
- commit/build SHA;
- test owner and approval;
- start/end timestamps;
- scenario, paths, request count and concurrency;
- synthetic tenant/data reference;
- p50/p95/p99 and error rate;
- provider/database observations;
- failures with sanitized request ids;
- stop condition triggered, if any;
- remediation/owner;
- Go/No-Go decision.

## Current status

A safe smoke runner and unit tests exist on the audit branch. No current-commit production-like load baseline, authenticated workload result or soak test evidence is attached. Performance therefore remains a release evidence gap, not a proven enterprise capability.
