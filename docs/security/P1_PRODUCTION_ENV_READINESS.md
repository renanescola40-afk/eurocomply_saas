# P1 production environment readiness

This document separates deploy readiness from final P1 evidence.

## Current rule

Production-backed P1 controls must not be marked `Complete` until the required Production environment variables exist in Vercel and the related runtime evidence has been collected.

## Required before closing P1-04

The following variable names must be visible in Vercel Production with values redacted in screenshots/evidence:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

These prove that sensitive endpoint rate limiting can use the distributed Upstash/Redis backend in Production.

## Required before relying on Production deploy evidence

- `NEXT_PUBLIC_APP_URL`

The value must be the HTTPS production application URL, for example:

```text
https://eurocomply-saas.vercel.app
```

## Validation command

Run this check only in an environment that has the Production variables available:

```bash
node scripts/security/check-p1-production-env-readiness.mjs
```

## Evidence discipline

Do not paste secret values into evidence. Screenshots must show only variable names, environment scope, and redacted/sensitive value markers.

This file does not mark any P1 control complete. It exists to avoid closing production-backed controls based on incomplete environment evidence.
