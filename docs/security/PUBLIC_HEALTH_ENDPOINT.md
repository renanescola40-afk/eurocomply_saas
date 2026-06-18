# Public Health Endpoint Contract

`/api/health` is a public liveness endpoint for load balancers and uptime checks.

It must stay intentionally minimal:

- return only a generic service identifier, status, timestamp, and application check;
- never expose deployment environment, commit identifiers, provider names, secret names, or detailed dependency readiness;
- use `noStoreJson` so every response receives no-store headers;
- keep `X-Content-Type-Options: nosniff`;
- avoid database, billing, storage, or provider calls.

Operational readiness details belong in token-protected readiness and ops endpoints, not in public liveness checks.

Regression coverage lives in `scripts/security/check-security-responses.mjs`, which runs in `security:ci` via `security:responses`.
