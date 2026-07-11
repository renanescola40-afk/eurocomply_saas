# Load Test Plan

Status: plan only. No production performance claim is valid until measured evidence exists.

## Safety rules

- Run against an approved staging or isolated production-like target.
- Do not load-test Stripe, Supabase Auth, email, Sentry or other third-party endpoints directly.
- Use synthetic tenants and non-sensitive data.
- Define abort thresholds, owner, test window and rollback before execution.
- Keep destructive mutations disabled unless the environment is disposable.

## Scenarios

1. Public smoke: landing, pricing, trust and health.
2. Authenticated read: dashboard summary, inventory list, risk list and audit-log pagination.
3. Bounded mutation: create/update a synthetic AI-system record with idempotent cleanup.
4. Readiness dependency degradation: verify fast, sanitized 503 behavior without retry storms.
5. Rate-limit behavior: confirm fair limits and fail-closed behavior for critical actions.

## Workload stages

- Warm-up: low concurrency to populate caches and verify correctness.
- Baseline: expected normal traffic for 10–15 minutes.
- Peak: forecast peak concurrency for 15 minutes.
- Stress: gradual increase until an agreed saturation signal; stop before provider harm.
- Recovery: return to baseline and verify latency/error recovery.

## Metrics and initial targets

Targets are hypotheses until baselined:

- Public LCP p75: <= 2.5 s on representative mobile conditions.
- CLS p75: <= 0.1.
- INP p75: <= 200 ms.
- Critical API p95: <= 500 ms for normal reads; p99 <= 1.5 s.
- Dashboard server response p95: <= 1.5 s excluding cold-start outliers.
- Error rate: < 1% at expected peak, with zero cross-tenant or authorization failures.

## Required observations

Capture throughput, p50/p95/p99 latency, status-code distribution, route error rate, database query time, connection usage, serverless concurrency, memory, rate-limit rejects and dependency failures. Correlate results using build SHA and requestId.

## Pass/fail

Fail on any data-isolation issue, auth bypass, uncontrolled retry amplification, sustained error rate above threshold, p99 timeout pattern, database saturation without recovery, or inability to attribute failures to a route/build. A failed test cannot be waived as Enterprise Go without owner, mitigation, expiry and approver.

## Evidence output

Store a redacted JSON/Markdown summary under `docs/security/evidence/runtime/` containing target fingerprint, commit SHA, date, tool version, scenario configuration, results, aborts, findings and final outcome. Never commit credentials, cookies or raw customer payloads.
