# Google OAuth Enterprise Configuration

This runbook documents the production and preview configuration required for Google OAuth through Supabase Auth.

## Architecture

RISCK COMPLY starts Google OAuth from the server route `GET /auth/google`. The route resolves the configured application base URL, builds an exact `/auth/callback` redirect URL, and starts Supabase Auth with provider `google`.

Supabase redirects back to `GET /auth/callback`, where the server exchanges the OAuth code for a Supabase session. Browser code must not exchange OAuth codes directly; the client entrypoint only navigates to `/auth/google`.

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
2. Paste `GOOGLE_CLIENT_ID`.
3. Paste `GOOGLE_CLIENT_SECRET` only into Supabase/provider secret storage.
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

Server/provider secret store only:

```text
GOOGLE_CLIENT_ID=<google-web-client-id>
GOOGLE_CLIENT_SECRET=<google-web-client-secret>
```

Public runtime values:

```text
NEXT_PUBLIC_APP_URL=https://<production-host>
NEXT_PUBLIC_SITE_URL=https://<production-host>
NEXT_PUBLIC_SUPABASE_URL=https://<supabase-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Google client secrets must never use `NEXT_PUBLIC_` and must never be logged, returned to the browser or committed.

## Redirect and open redirect policy

Accepted post-login `next` values are local dashboard paths only:

```text
/<locale>/dashboard...
```

The auth callback rejects or normalizes:

- absolute URLs such as `https://evil.example/path`;
- protocol-relative URLs such as `//evil.example/path`;
- root-only `/`;
- non-dashboard paths;
- paths for unsupported locales.

The middleware redirects unauthenticated private routes to the localized login page and preserves the requested local path in `next`. Authenticated users visiting localized login/signup or localized marketing home are redirected to the organization dashboard.

## Session control

Supabase SSR middleware calls `supabase.auth.getUser()` for protected routes so expired sessions are refreshed through Supabase cookies when possible and unauthenticated users are redirected with private no-store headers.

Sensitive endpoints must require step-up tokens through `requireStepUpForRequest()` before executing billing, export, audit chain verify, GDPR delete, security settings or team role-change actions.

## Enterprise release status

Google OAuth readiness is a Go only after production and preview login are tested with exact redirect URIs and token/cookie redaction is verified in logs.

Enterprise auth remains No-Go when either of these is true:

- Supabase MFA or enterprise IdP reauthentication is not configured.
- Live step-up runtime proof is missing for the target environment.
