# Clerk setup for RISCK COMPLY

> Legacy note: Clerk runtime integration has been removed from the application shell. RISCK COMPLY currently uses Supabase Auth for login, signup and session handling. This document is retained only as historical context for the previous Clerk evaluation and for any future rollback investigation.

## Security first

A Clerk backend secret was exposed outside the provider dashboard during setup. If any Clerk project from this evaluation still exists, rotate or revoke that secret in Clerk before reusing the project in any environment.

Required action in Clerk dashboard when retaining an old Clerk project:

1. Open **Configure → API Keys**.
2. Revoke or rotate the exposed backend secret.
3. Remove unused Clerk values from local development env files and deployment secret stores.
4. Never commit real Clerk secrets to GitHub.

## Historical environment variables

These names were used only by the retired Clerk evaluation:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/pt/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/pt/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/pt/dashboard/organizations
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/pt/dashboard/organizations
```

Do not add these values back unless a new reviewed Clerk migration PR intentionally restores Clerk runtime support.

## Historical branch changes

The retired Clerk evaluation previously attempted to:

- Wrap the localized app layout with `ClerkProvider`.
- Replace the Supabase-backed compatibility hook in `src/hooks/useAuth.tsx` with Clerk hooks.
- Replace the localized login and signup pages with Clerk `SignIn` and `SignUp` components.
- Replace Supabase session checks in `src/middleware.ts` with Clerk middleware checks.
- Keep Supabase imports where the app still uses Supabase for tenant data, documents, logs, billing state, and compliance records.

Those runtime changes are obsolete and should not be used as the current auth runbook.

## Validation commands

The obsolete `npm run clerk:env` package alias has been removed. For the current Supabase Auth release path, run the supported project checks instead:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:public-secrets
```

Do not proceed to production until the current supported checks pass and any unused legacy Clerk provider secrets have been removed or revoked.
