# Netlify QA preview guard (candidate, 20 November 2026)

Status: proposed. This is not a Production release or authorization to deploy.

## Decision

Allow the existing QA build validator to recognise a Netlify **deploy-preview** only when Netlify's build metadata identifies that context, the explicitly configured QA flag is present, and `NEXT_PUBLIC_APP_URL` exactly matches the HTTPS `DEPLOY_PRIME_URL` under `netlify.app`. Keep the Vercel Preview branch and all existing QA database, identity, Stripe TEST and no-outbound-email checks. Run this validator before the Netlify build through `netlify.toml`.

## Safety boundary

- Production Supabase project, privileged credentials, LIVE Stripe, outbound email and commercial origin remain forbidden in QA. Mixed Vercel/Netlify markers fail.
- A branch deploy or production deploy is not treated as QA. The Netlify Production context is **not** a launch approval; it must not be connected to real users or the domain through this candidate.
- For a no-billing bootstrap, use `RISCK_QA_BOOTSTRAP_NO_BILLING=true` with no Stripe API key. The Stripe QA webhook route and TEST ledger still require `VERCEL_ENV=preview` and the webhook writer remains deliberately fail-closed. This change does not enable billing, entitlement writes, or a webhook lifecycle test on Netlify.
- Build metadata and the validator are only configuration preflight. A successful build does not prove Supabase Auth callbacks, RLS, runtime isolation, upload safety, logging, or legal readiness.
- No QA secrets or provider bindings are included in this repository. Do not set credentials in `netlify.toml` or expose Production environment values.

## Deployment dependency and rollback

Before any preview, review the permissions requested to connect the GitHub repository, ensure a non-production project and origin, scope build/runtime variables to the preview, and confirm no Production DNS or automatic paid activation. A preview may be discarded without changing Production. Reverting this change returns the Vercel-only QA validator; leave an existing Netlify preview offline rather than let it run without the guard.

Acceptance requires the exact-head checks and independent review under `AGENTS.md`. If an account cannot provide a private or appropriately restricted preview, do not use real customer data or promote it as a SaaS deployment.
