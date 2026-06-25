# Clerk setup for RISCK COMPLY

This branch migrates application authentication from Supabase Auth to Clerk while keeping Supabase available as the application database/data API.

## Security first

A Clerk backend secret was exposed outside the provider dashboard during setup. Rotate it in Clerk before using Clerk in any environment.

Required action in Clerk dashboard:

1. Open **Configure → API Keys**.
2. Revoke or rotate the exposed backend secret.
3. Copy the new value only into local development env files and deployment secret stores.
4. Never commit real Clerk secrets to GitHub.

## Environment variables

Local development needs these variable names configured with your own values:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/pt/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/pt/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/pt/dashboard/organizations
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/pt/dashboard/organizations
```

Production values must be configured in Vercel/GitHub/Supabase provider secret stores, not committed.

## What this branch changes

- Wraps the localized app layout with `ClerkProvider`.
- Replaces the Supabase-backed compatibility hook in `src/hooks/useAuth.tsx` with Clerk hooks.
- Replaces the localized login and signup pages with Clerk `SignIn` and `SignUp` components.
- Replaces Supabase session checks in `src/middleware.ts` with Clerk middleware checks.
- Keeps Supabase imports where the app still uses Supabase for tenant data, documents, logs, billing state, and compliance records.

## Required local command

The dependency was added to `package.json`, but the lockfile must be regenerated locally:

```bash
npm install
```

Commit the resulting `package-lock.json` update before opening/merging the PR.

## Enterprise/B2B target

Use Clerk Organizations as the B2B identity layer:

- Organization/workspace switcher
- `org:admin` and `org:member` roles
- Permissions for billing, members, API keys, audit logs, and settings
- Clerk organization ID mapped to the existing workspace/organization model
- Organization ID stored on every tenant-owned row

Recommended first permissions:

```txt
dashboard:view
members:manage
billing:manage
api_keys:manage
settings:update
audit_logs:view
```

## Validation commands

After rotating the Clerk secret and running `npm install`, run:

```bash
npm run clerk:env
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:public-secrets
```

Do not proceed to production until all commands pass and the exposed Clerk backend secret has been rotated.
