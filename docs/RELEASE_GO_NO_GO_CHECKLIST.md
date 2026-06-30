# Release Go/No-Go Checklist

Final gate for paid public production launch.

## Current release decision

- Release name: Public Production Readiness 100% Gate - 2026-06-30
- Latest assessed branch: `release/public-production-readiness-100`
- Release owner: @renansilva2002 / renanescola40-afk
- Security owner: @renansilva2002 / renanescola40-afk
- Environment: production / staging launch candidate
- Decision: **No-Go** until `npm run release` passes and writes complete runtime evidence for the promoted commit.

## Required command

```bash
npm run release
```

The `release` script is recursion-safe. It does not call itself. It expands the requested release loop into concrete gates: deterministic install, lint, typecheck, tests twice, build, security, deployment smoke, rollback dry-run and release readiness.

## Required evidence files

The release command must write these files with `status: Complete` and `outcome: passed`:

- `docs/security/evidence/runtime/deployment-smoke-validation.json`
- `docs/security/evidence/runtime/rollback-dry-run-validation.json`
- `docs/security/evidence/runtime/production-final-validation.json`

## Mandatory Public Production Go criteria

Public Production Go is allowed only when all items below pass for the same commit SHA:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test` twice
- `npm run build`
- `npm run security`
- deployment smoke against the configured production or staging URL
- `/api/health` returns HTTP 200 and JSON `status: ok`
- `/api/ready` rejects anonymous requests
- `/api/ready` accepts the configured bearer health token
- `/api/ready` validates Supabase environment and database reachability
- `/api/ready` validates Stripe environment and live price lookup
- `/api/ready` validates Sentry / observability configuration
- landing, pricing, trust, login and signup pages load
- dashboard routes redirect unauthenticated users to login
- private routes return `Cache-Control: no-store`
- sensitive APIs return `Cache-Control: no-store`
- required security headers are present
- rollback target URL exists and passes `/api/health`
- last validated commit SHA is recorded
- build SHA is recorded
- runtime evidence is redacted and contains no credential material

## Automatic No-Go criteria

Keep **No-Go** if any critical gate fails or if any required evidence file is missing, `Open`, failed, stale, invalid JSON, or tied to a different commit or runtime target.

Never downgrade a critical failure to a warning. Public Production Go requires real passing JSON evidence.

## Current evidence mapping

| Area | Required evidence | Current status | Decision |
| --- | --- | --- | --- |
| Final release command | `production-final-validation.json` Complete/passed | Runner added; target run still required | No-Go |
| Deployment smoke | `deployment-smoke-validation.json` Complete/passed | Smoke expanded with signup, Stripe, no-store and rollback URL checks | No-Go until target run passes |
| Rollback | `rollback-dry-run-validation.json` Complete/passed | Existing dry-run gate retained | No-Go until target run passes |
| Supabase | `/api/ready` database reachable | Runtime check enforced | No-Go until target run passes |
| Stripe | `/api/ready` live price lookup | Runtime check enforced | No-Go until target run passes |
| Sentry / observability | `/api/ready` observability configured | Runtime check enforced | No-Go until target run passes |
| Public pages | landing, pricing, trust, login, signup | Smoke enforced | No-Go until target run passes |
| Private controls | auth redirect and no-store | Smoke enforced | No-Go until target run passes |
| Build metadata | commit SHA and build SHA | Required by final evidence | No-Go until present |

## Current blockers

| Blocker | Owner | Closure evidence |
| --- | --- | --- |
| Final `npm run release` not proven passed | @renansilva2002 / renanescola40-afk | Passing `production-final-validation.json` |
| Deployment smoke not proven passed | @renansilva2002 / renanescola40-afk | Passing `deployment-smoke-validation.json` |
| Rollback target not proven passed | @renansilva2002 / renanescola40-afk | Passing `rollback-dry-run-validation.json` |
| Runtime services not proven on target | @renansilva2002 / renanescola40-afk | `/api/ready` Complete/passed for Supabase, Stripe and observability |

## Final decision

**No-Go.**

The release system is now wired for a paid public launch gate, but the product must not be marked Public Production Go until all P0 checks pass with real JSON evidence.
