# Connect the coding agent

This note keeps the external coding-agent handoff repeatable without exposing secrets or changing production behavior.

## Scope

Use this checklist when a coding agent, IDE agent, or cloud code assistant needs to work on EuroComply repository changes.

## Required access

- GitHub repository access with least-privilege permissions.
- A branch created from the current `main` branch.
- No direct writes to protected production branches.
- No copied provider secrets, `.env` values, database credentials, Stripe keys, Supabase service-role keys, Vercel tokens, or private customer data in prompts, comments, screenshots, or committed evidence.

## Safe workflow

1. Create a focused branch from `main`.
2. Describe the intended change and risk level before editing.
3. Keep changes small and reviewable.
4. Run the relevant checks before merge when dependencies are available:

```bash
npm run lint
npm run typecheck
npm run test
npm run security:ci
npm run build
```

5. For security-sensitive changes, also run the matching targeted gate, for example upload, billing, route quality, secret scanning, or RLS evidence checks.
6. Open a PR and wait for CI/Vercel/security checks. Do not merge on Vercel quota failure unless GitHub checks prove the app build is otherwise green and the deployment can be retried safely.

## Production configuration rules

- Provider stores are the source of truth for secrets and runtime values.
- Public `NEXT_PUBLIC_*` values must be browser-safe.
- Enterprise demo flags are for controlled demo environments only and must not grant real entitlements.
- Billing changes must preserve server-side auth, organization scope, RBAC, rate limiting, Stripe metadata, and safe relative return URLs.
- Cron changes must keep the deployment within the configured scheduled-job limits and must require internal cron authorization.

## Evidence

When a correction is applied by an agent, record the audit summary and commit or PR reference in `agent_log.json` or the repository's approved agent evidence path before merge.
