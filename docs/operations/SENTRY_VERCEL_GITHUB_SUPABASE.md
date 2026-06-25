# Sentry + Vercel + GitHub + Supabase Integration Runbook

This runbook connects RISCK COMPLY observability across the application runtime, deployments, source code and Supabase operations without committing provider secrets.

## What is configured in this repository

- `@sentry/nextjs` is installed and the Next.js config is always wrapped with `withSentryConfig`.
- Client-side monitoring is initialized in `instrumentation-client.ts` when `NEXT_PUBLIC_SENTRY_DSN` is present.
- Node.js runtime monitoring is initialized in `sentry.server.config.ts` when `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` is present.
- Edge runtime monitoring is initialized in `sentry.edge.config.ts` when `NEXT_PUBLIC_SENTRY_DSN` is present.
- `instrumentation.ts` registers Sentry for Node.js and Edge runtimes and exports `onRequestError` for App Router/server errors.
- `src/app/global-error.tsx` captures top-level App Router render errors.
- The Sentry tunnel route is `/monitoring` and is excluded from `proxy.ts` matching.
- Events are sanitized before delivery by dropping raw `request` and `user` payloads.

## Sentry project setup

1. Create or open the Sentry organization for RISCK COMPLY.
2. Create a JavaScript / Next.js project.
3. Copy the project DSN.
4. Create an auth token with permissions to upload source maps/releases for this project.
5. Store the token only in provider secret stores, never in the repository.

## Vercel environment variables

Set these in Vercel Project Settings for Production, Preview and Development as needed:

```text
NEXT_PUBLIC_SENTRY_DSN=<public project dsn>
SENTRY_DSN=<server dsn, or same DSN if no separate server DSN is used>
SENTRY_ORG=<sentry org slug>
SENTRY_PROJECT=<sentry project slug>
SENTRY_AUTH_TOKEN=<sentry auth token for source map upload>
SENTRY_TRACES_SAMPLE_RATE=0.05
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05
```

Optional release/environment overrides:

```text
SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=<git commit sha or release id>
NEXT_PUBLIC_SENTRY_RELEASE=<git commit sha or release id>
```

Vercel system environment variables are used as fallbacks where available. Source maps upload only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are all set.

## GitHub connection in Sentry

1. In Sentry, install the GitHub integration for the account that owns `renanescola40-afk/eurocomply_saas`.
2. Grant Sentry access to this repository.
3. Enable suspect commits and issue linking.
4. Keep source-map upload token rotation documented in the security runbook.
5. Do not store `SENTRY_AUTH_TOKEN` as a plain repository variable. Use GitHub Actions secrets only if a GitHub workflow needs it.

## Supabase connection notes

Sentry does not replace Supabase logs. Use both together:

- Use Sentry for application exceptions, API route failures, App Router errors and performance traces.
- Use Supabase logs for Postgres, Auth, Storage and Edge Function diagnostics.
- Do not send raw compliance documents, Supabase service-role keys, access tokens or full user payloads to Sentry.
- When reporting Supabase-related application errors, pass only sanitized context such as tenant id hash, operation name, table name, request id and error code.

## Verification checklist

1. Deploy a Vercel Preview with `NEXT_PUBLIC_SENTRY_DSN` set.
2. Trigger a client-side test error from an app page, not the browser console.
3. Trigger an API route or server component error and verify it appears in Sentry.
4. Confirm source maps are uploaded during `next build` when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are present.
5. Confirm `/monitoring` receives browser events and is not intercepted by `proxy.ts`.
6. Confirm no event includes raw request headers, cookies, user payloads, Supabase service-role keys or document content.
7. Cross-check the same incident timestamp against Vercel runtime logs and Supabase logs.
