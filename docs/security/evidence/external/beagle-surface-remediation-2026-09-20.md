# RISCK COMPLY — Beagle surface remediation evidence

Date: 2026-09-20

Scope: surface-level hardening findings from the Beagle Security report dated 2026-09-18 for https://www.risckcomply.com.

This artifact does not claim a comprehensive penetration test or full independent security assurance.

## Verified production anchor

At the time of verification, the canonical production surface was bound to:

- Git SHA: `9346a694f98b69314661886c0513f908ee5b5ae7`
- Vercel production deployment: `dpl_4BCMDjTtaz6GFX34ZovhbyzrjkAe`
- Deployment state: `READY`
- Target: `production`
- Canonical URL: `https://www.risckcomply.com`

The repository `main` subsequently advanced to `52f4b7e6f3c7f2c8902617252337f859df36dbe9` for Enterprise 100 concurrency stabilization. Exact-SHA production verification for that newer main release must be re-run before treating this artifact as bound to the newer release.

## Surface controls verified on 2026-09-20

The canonical production homepage and `/api/health` returned HTTP 200 with:

- `Content-Security-Policy` present.
- CSP includes `default-src 'self'`.
- CSP includes `object-src 'none'`.
- CSP includes `base-uri 'self'`.
- CSP includes `frame-ancestors 'none'`.
- CSP includes `form-action 'self' https://checkout.stripe.com`.
- CSP allows the current required Stripe, Supabase, Sentry, Vercel Insights and PostHog origins.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- `Permissions-Policy` present.
- No `Access-Control-Allow-Origin: *` was observed on the verified public responses.

Additional public checks returned HTTP 200 with the same security-header baseline for:

- `/`
- `/en`
- `/en/pricing`
- `/en/privacy`
- `/en/login`
- `/en/signup`
- `/brand/risck-comply-wordmark.svg`

HTTP downgrade protection was verified:

- `http://www.risckcomply.com/` returned `308 Permanent Redirect` to HTTPS.

## Finding disposition

| Finding | Current disposition |
| --- | --- |
| Content-Security-Policy missing | Technically remediated and verified in production |
| X-Content-Type-Options missing | Technically remediated and verified in production |
| X-Frame-Options missing / clickjacking | Technically remediated with CSP `frame-ancestors 'none'` plus `X-Frame-Options: DENY` |
| Referrer-Policy weak/missing | Technically remediated and verified in production |
| HSTS | Preserved and verified |
| CORS | Preserved; no wildcard origin observed on verified public responses; repository hardening rejects wildcard CORS on critical endpoints |
| HTTPS redirection | Preserved and verified |
| X-XSS-Protection absent | `1; mode=block` intentionally not introduced; legacy browser XSS filtering is not used as a substitute for CSP and framework output escaping |

## Regression protection

Release smoke and production-response proof scripts require:

- CSP `default-src 'self'`;
- CSP `object-src 'none'`;
- CSP `frame-ancestors 'none'`;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- HSTS with `max-age` and `includeSubDomains`;
- exact `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy`.

## Explicit boundary

This evidence closes only the specific Beagle surface-hardening findings. It does not by itself prove:

- authenticated tenant isolation;
- RLS/RBAC/BOLA/IDOR;
- privilege-escalation resistance;
- session/password-recovery security;
- upload/storage isolation;
- Stripe entitlement or business-logic abuse resistance;
- clean independent pentest/retest acceptance.

Those controls remain governed by their separate technical and external-assurance evidence lanes.
