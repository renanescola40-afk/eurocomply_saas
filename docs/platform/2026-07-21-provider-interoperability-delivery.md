# Provider interoperability delivery

This platform-access delivery adds protected, read-only runtime proof for Supabase/Auth, Stripe and Sentry.

## Added controls

- Supabase Auth settings reachability;
- Google OAuth provider enablement signal;
- Stripe account API access and mode signal;
- expected enabled Stripe webhook endpoint lookup;
- Sentry project API access and identity match;
- redacted exact-SHA JSON evidence retained for 90 days.

## Files

- `.github/workflows/platform-provider-interoperability.yml`
- `scripts/platform/probe-provider-interoperability.mjs`
- `tests/security/platform-provider-interoperability-contract.test.mjs`
- `docs/runbooks/platform-provider-interoperability.md`

## External completion action

The repository owner must configure the protected `production-provider-proof` environment and execute the strict runtime workflow. Transaction-level proof for OAuth login, Stripe delivery and Sentry ingestion remains separate.
