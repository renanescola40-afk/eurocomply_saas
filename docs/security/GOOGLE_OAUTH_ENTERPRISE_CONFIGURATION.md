# Google OAuth Enterprise Configuration

This runbook documents the production and preview configuration required for Google OAuth through Supabase Auth.

## Architecture

RISCK COMPLY starts the current Google OAuth flow in the browser through `supabase.auth.signInWithOAuth({ provider: 'google' })`. The client supplies an exact application continuation at `/auth/callback` with an allowlisted locale and optional safe `next` path.

Supabase sends the browser through the configured Google provider and then redirects the application code back to `GET /auth/callback`, where the server exchanges the authorization code for a Supabase session. A localized compatibility route at `/<locale>/auth/callback` re-exports the same hardened callback handler because locale middleware may prefix unlocalized application routes.

`GET /auth/google` is retained only as a hardened legacy compatibility surface. It does not own the current provider initiation flow; it safely redirects to the localized login page, preserves only an allowlisted same-locale continuation, marks the redirect with `notice=legacy_google_route`, uses the configured application base URL, and fails closed when that base URL is unavailable. Because middleware localizes unprefixed application routes, `/<locale>/auth/google` must re-export the same root handler.

## Google Cloud Console

Create or reuse a Google Cloud project dedicated to the production identity boundary.

### OAuth consent screen

Configure the consent screen with:

- User type: External, unless this is a strictly internal Google Workspace deployment.
- App name: RISCK COMPLY.
- User support email: production support mailbox.
- App domain: the production application domain.
- Authorized domains: production root domain only; add preview host domains only when the preview domain is a controlled deployment provider domain.
- Developer contact email: security/operations owner.
- Scopes: keep to the minimum OpenID Connect set required by Supabase Auth: `openid`, `email`, `profile`.
- Publishing status: production after Google verification, if applicable.

Do not request Drive, Gmail, Calendar, Admin SDK or other Google APIs for authentication-only login.

### OAuth client

Create a Web application OAuth client.

Authorized JavaScript origins must be exact origins only:

```text
https://<production-host>
https://<preview-host>
```

Local development may include:

```text
http://localhost:3000
```

Authorized redirect URIs must be exact Supabase provider callback URLs, not application callback URLs:

```text
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

If Supabase uses a custom auth domain, use the custom auth callback exactly:

```text
https://<auth-domain>/auth/v1/callback
```

Do not add wildcard redirect URIs. Do not add broad path prefixes. Do not add arbitrary preview branch URLs unless they are intentionally supported and controlled.

## Supabase Auth provider

In Supabase Dashboard > Authentication > Providers > Google:

1. Enable Google.
2. Paste the Google OAuth web client ID.
3. Paste the Google OAuth client secret only into Supabase/provider secret storage.
4. Confirm the provider callback URL displayed by Supabase matches the Google Authorized redirect URI exactly.

In Supabase Dashboard > Authentication > URL Configuration:

Site URL:

```text
https://<production-host>
```

Additional Redirect URLs:

```text
https://<production-host>/auth/callback
https://<preview-host>/auth/callback
```

Local development may include:

```text
http://localhost:3000/auth/callback
```

Preview deployments must use exact redirect URLs whenever possible. If the deployment provider requires preview patterns, restrict them to the provider-owned preview domain and document the pattern owner, scope and expiry.

## Application environment

The Google OAuth client ID and client secret belong to the Supabase Google provider configuration. The application does not need those provider secrets in browser-visible environment variables and must not duplicate the Google client secret into `NEXT_PUBLIC_*` configuration.

Application runtime values include:

```text
NEXT_PUBLIC_APP_URL=https://<production-host>
NEXT_PUBLIC_SITE_URL=https://<production-host>
NEXT_PUBLIC_SUPABASE_URL=https://<supabase-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-publishable-or-compatible-anon-key>
```

Provider secrets must never be logged, returned to the browser or committed.

## Redirect and open redirect policy

The current auth flow accepts only explicit product continuations for the selected locale. Depending on the entry flow, the allowlist includes onboarding, checkout, the organization dashboard and the observability dashboard.

The auth flow rejects or normalizes:

- absolute URLs such as `https://evil.example/path`;
- protocol-relative URLs such as `//evil.example/path`;
- paths for unsupported locales;
- destinations outside the explicit callback/signup allowlists;
- excessively long continuation values.

The middleware redirects unauthenticated private routes to the localized login page and preserves the requested local path in `next`. Authenticated users visiting localized login/signup or localized marketing home are redirected through the current authenticated onboarding path.

## Session control

Supabase SSR middleware calls `supabase.auth.getUser()` for protected routes so expired sessions are refreshed through Supabase cookies when possible and unauthenticated users are redirected with private no-store headers.

Sensitive endpoints must require step-up tokens through `requireStepUpForRequest()` before executing billing, export, audit chain verify, GDPR delete, security settings or team role-change actions.

## Enterprise release status

Google OAuth readiness is a Go only after production and preview login are tested with exact redirect URIs and token/cookie redaction is verified in logs.

A source/build contract is not a substitute for a legitimate browser login proof on the exact accepted release. The retained proof must cover provider initiation, consent/provider redirect, application callback/code exchange, session establishment, protected-route access, logout and subsequent denial without exposing tokens or provider secrets.

Enterprise auth remains No-Go when required exact-release runtime evidence, MFA/enterprise IdP controls or live step-up proof for the target environment are still missing.
