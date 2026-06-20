# Secrets Management

EuroComply production secrets must live only in provider secret stores. The repository may contain variable names, policy, redacted evidence, and placeholder examples, but it must never contain secret values.

## Source of truth

| Secret class | Provider store | Client exposure |
| --- | --- | --- |
| Supabase public URL and anon key | Vercel/GitHub environment variable or secret | Allowed only as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase service role and access token | Vercel/GitHub/Supabase secret stores | Server-side only |
| Stripe publishable key and price IDs | Vercel/GitHub environment variables | Public values only |
| Stripe secret key and webhook signing secret | Vercel/GitHub/Stripe secret stores | Server-side only |
| Sentry browser DSN | Vercel/GitHub environment variable | Allowed only as `NEXT_PUBLIC_SENTRY_DSN` |
| Sentry auth token | GitHub/Vercel provider secrets | CI/provider only |
| Cron, healthcheck, step-up, signing, and rate-limit tokens | Vercel/GitHub provider secrets | Server-side/provider only |
| Vercel deploy credentials | GitHub Actions `production` environment secrets | CI only |

## Naming rules

`NEXT_PUBLIC_*` is allowed only for values that are safe to send to every browser user. Do not add `NEXT_PUBLIC_*` variables for service roles, access tokens, signing secrets, webhook secrets, private keys, provider auth tokens, or database URLs.

Server-only variables must be read only from server code, route handlers, server actions, background jobs, build/deploy providers, or CI provider stores. They must not be imported by client components or shared browser utilities.

## Repository rules

- `.env.example` contains required variable names and empty or obvious placeholder values only.
- Real `.env`, `.env.local`, `.env.production`, provider exports with values, and screenshots with visible values must not be committed.
- Runtime evidence committed to the repo must be redacted and must set `valuesRedacted` to `true`.
- Screenshots or exports proving provider values exist must be stored privately outside the repository.
- Workflows must use `secrets.*` or `vars.*` provider contexts and must not print secrets with `echo`, `printf`, `tee`, or `cat`.

## Required gates

Run these before production release or after changing environment wiring:

```bash
npm run lint
npm run typecheck
npm run test
npm run security:public-secrets
npm run security:production-secrets
npm run security:ci-cd
npm run build
```

The `Secret Scanning` GitHub Actions workflow runs Gitleaks against full git history and runs `npm run security:production-secrets`. CI must fail if a real secret, sensitive public variable name, server-only client reference, unsafe workflow print, or incomplete runtime evidence is detected.

## Rotation procedure

When a secret is suspected to have leaked:

1. Revoke or rotate the value in the owning provider.
2. Replace the value in Vercel/GitHub/Supabase/Stripe/Sentry provider stores as applicable.
3. Confirm no value-bearing screenshot or export was committed.
4. Run the required gates and Gitleaks full-history scan.
5. Record a redacted evidence update in `docs/security/evidence/runtime/` and keep private proof outside the repo.

## Production evidence rule

`P0_RUNTIME_EVIDENCE_REGISTER.md` may mark production secrets as `Complete` only when `docs/security/evidence/runtime/production-secrets-provider-stores.json` is present, structurally complete, redacted, reviewed, tied to a commit SHA, and states that value-bearing screenshots/exports are stored privately outside the repository.
