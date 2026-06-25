# Clerk setup for RISCK COMPLY

This repository currently uses Supabase Auth in middleware and client auth hooks. Clerk should be introduced in a staged migration so production auth does not break.

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

## Recommended migration plan

1. Keep the current Supabase Auth flow active until Clerk is fully validated.
2. Install Clerk locally:

   ```bash
   npm install @clerk/nextjs
   ```

3. Commit the generated `package-lock.json` after install.
4. Wrap `src/app/layout.tsx` with `ClerkProvider`.
5. Add Clerk-powered routes behind a feature flag or separate path first, for example `/pt/clerk-login` and `/pt/clerk-signup`.
6. Enable Clerk Organizations in the dashboard.
7. Map Clerk organization IDs to the existing organization/workspace model.
8. Only after validation, replace Supabase Auth checks in `src/middleware.ts` and `src/hooks/useAuth.tsx`.

## Enterprise/B2B target

Use Clerk Organizations as the B2B identity layer:

- Organization/workspace switcher
- `org:admin` and `org:member` roles
- Permissions for billing, members, API keys, audit logs, and settings
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

After installing Clerk and applying code changes, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:public-secrets
```

Do not proceed to production until all commands pass and the old exposed Clerk secret has been rotated.
